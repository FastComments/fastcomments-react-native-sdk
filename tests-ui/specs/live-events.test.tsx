/**
 * Ports LiveEventUserA_UITests + LiveEventUserB_UITests -> RN SDK as a single
 * Node process running two SDK instances ("two devices on the same urlId").
 *
 * Each phase exercises a different live-event path:
 *  Phase 1 - new-comment    (B posts via UI, A sees via WS)
 *  Phase 2 - new-vote       (B upvotes A's comment, A's count ticks up)
 *  Phase 3 - presence       (B's row shows online dot on A's tree)
 *  Phase 4 - deleted-comment (B deletes own comment, A sees removal)
 *  Phase 5 - pin            (admin pins A's comment, A sees pinIcon via WS)
 *  Phase 6 - lock           (admin locks A's comment, A sees lockIcon via WS)
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { seedComment, fetchLatestCommentId } from '../framework/api/comments-rest';
import { lockComment, pinComment } from '../framework/api/admin-rest';
import { clearAlerts, pressLatestAlertButton } from '../framework/harness/alert-helper';
import { textOf } from '../framework/harness/text-of';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Live events (dual-instance)', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    function renderTwo(opts: { showLiveRightAway?: boolean } = {}) {
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        // Without showLiveRightAway, new live comments arrive hidden behind a
        // "N new comments" affordance (live.ts:90). For these tests we want
        // immediate visibility so we can assert on rendered text.
        const overrides = opts.showLiveRightAway === false ? undefined : { showLiveRightAway: true };
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA, overrides });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB, overrides });
        const a = render(<FastCommentsLiveCommenting config={cfgA} />);
        const b = render(<FastCommentsLiveCommenting config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());
        return { a, b, ssoA, ssoB };
    }

    it('Phase 1 - live new comment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-new', urlIdLabel: 'live-new' });
        const { a, b } = renderTwo();

        // Both should be loaded. B types a comment.
        await pollUntil(() => !!b.queryByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'B input visible',
        });
        await pollUntil(() => !!a.queryByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'A input visible (subscribed to live events)',
        });
        // Allow B's WebSocket to attach before A subscribes - else B's send-event
        // can fire before the server-side broadcast registers A.
        await sleep(500);

        const text = `Live from B ${Date.now()}`;
        fireEvent.changeText(b.getByTestId('commentInput'), text);
        fireEvent.press(b.getByTestId('sendButton'));

        // A should observe the comment via WS.
        await pollUntil(() => !!a.queryByText(text), {
            timeoutMs: 20000,
            label: `A sees B's live comment "${text}"`,
        });
    }, 90000);

    it('Phase 2 - live vote', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-vote', urlIdLabel: 'live-vote' });
        // A seeds a comment via REST, both trees mount, B taps upvote, A's
        // count should tick up via WS.
        const ssoA = ctx.ssoFor('userA');
        const targetId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Vote target from A',
            ssoToken: ssoA,
        });

        const { a, b } = renderTwo();
        await pollUntil(() => !!a.queryByText('Vote target from A'), {
            timeoutMs: 15000,
            label: "A sees its seeded comment",
        });
        await pollUntil(() => !!b.queryByText('Vote target from A'), {
            timeoutMs: 15000,
            label: "B sees seeded comment",
        });

        const upBtnB = b.queryByTestId(`upVoteButton-${targetId}`);
        expect(upBtnB).not.toBeNull();
        fireEvent.press(upBtnB!);

        await pollUntil(
            () => {
                const counter = a.queryByTestId(`upVoteCount-${targetId}`) as any;
                if (!counter) return false;
                return textOf(counter).trim() === '1';
            },
            { timeoutMs: 20000, label: "A's upVoteCount becomes 1 via live event" }
        );
    }, 120000);

    it('Phase 3 - live presence indicator', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-presence', urlIdLabel: 'live-presence' });
        const ssoA = ctx.ssoFor('userA');
        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Presence target B',
            ssoToken: ctx.ssoFor('userB'),
        });

        const { a } = renderTwo();
        await pollUntil(() => !!a.queryByText('Presence target B'), {
            timeoutMs: 15000,
            label: 'A sees B-authored comment',
        });

        // The server stores the SSO userId tenant-prefixed (`{tenantId}:userB`),
        // so the testID is built from the prefixed form. We don't know the
        // exact prefix here, so query by the generic prefix and assert at least
        // one online indicator exists in A's tree.
        await pollUntil(() => !!a.queryByTestId(/^onlineIndicator-/), {
            timeoutMs: 30000,
            label: "A sees an onlineIndicator (B's presence)",
        });
        void seededId;
    }, 120000);

    it('Phase 4 - live delete', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-delete', urlIdLabel: 'live-delete' });
        const { a, b } = renderTwo();
        await pollUntil(() => !!b.queryByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'B input visible',
        });
        await sleep(500);

        const text = `Delete me live ${Date.now()}`;
        fireEvent.changeText(b.getByTestId('commentInput'), text);
        fireEvent.press(b.getByTestId('sendButton'));

        // A sees the new comment via WS.
        await pollUntil(() => !!a.queryByText(text), {
            timeoutMs: 20000,
            label: 'A sees new comment',
        });

        // B opens menu and deletes.
        await pollUntil(() => !!b.queryByTestId(/^commentMenuButton-/), {
            timeoutMs: 5000,
            label: 'B menu button',
        });
        fireEvent.press(b.queryByTestId(/^commentMenuButton-/)!);
        await pollUntil(() => !!b.queryByTestId('menuItem-delete'), {
            timeoutMs: 5000,
            label: 'B delete item',
        });
        fireEvent.press(b.queryByTestId('menuItem-delete')!);
        await pollUntil(() => {
            try {
                pressLatestAlertButton('destructive');
                return true;
            } catch {
                return false;
            }
        }, { timeoutMs: 5000, label: 'destructive alert' });

        // A's tree should reflect the delete (the comment text disappears or
        // the row is replaced with the DELETED placeholder text).
        await pollUntil(
            () => !a.queryByText(text),
            { timeoutMs: 20000, label: "A sees comment removed via live event" }
        );
    }, 120000);

    it('Phase 5 - live pin', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-pin', urlIdLabel: 'live-pin' });
        const ssoA = ctx.ssoFor('userA');
        const adminSso = ctx.ssoFor('admin', { isAdmin: true });
        const targetId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Pin target from A',
            ssoToken: ssoA,
        });

        const { a } = renderTwo();
        await pollUntil(() => !!a.queryByText('Pin target from A'), {
            timeoutMs: 15000,
            label: 'A sees seeded comment',
        });

        await pinComment(ctx.tenant, targetId, adminSso);

        await pollUntil(() => !!a.queryByTestId(`pinIcon-${targetId}`), {
            timeoutMs: 20000,
            label: "A sees pin icon via live event",
        });
    }, 120000);

    it('Phase 6 - live lock', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-lock', urlIdLabel: 'live-lock' });
        const ssoA = ctx.ssoFor('userA');
        const adminSso = ctx.ssoFor('admin', { isAdmin: true });
        const targetId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Lock target from A',
            ssoToken: ssoA,
        });

        const { a } = renderTwo();
        await pollUntil(() => !!a.queryByText('Lock target from A'), {
            timeoutMs: 15000,
            label: 'A sees seeded comment',
        });

        await lockComment(ctx.tenant, targetId, adminSso);

        await pollUntil(() => !!a.queryByTestId(`lockIcon-${targetId}`), {
            timeoutMs: 20000,
            label: "A sees lock icon via live event",
        });
    }, 120000);
});
