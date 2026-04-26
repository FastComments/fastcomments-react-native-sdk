/**
 * Ports CommentActionsUITests.java -> React Native SDK.
 *
 * Covers pin / lock / flag / block UI affordances. Pin & lock are admin-only
 * server-side operations - we drive them via the public REST endpoints with an
 * admin SSO token, then assert that the SDK reflects the new state in the UI.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';
import { lockComment, pinComment } from '../framework/api/admin-rest';
import { clearAlerts, pressLatestAlertButton } from '../framework/harness/alert-helper';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Comment actions UI tests', () => {
    let ctx: TestContext;

    beforeEach(() => {
        clearAlerts();
    });

    afterEach(async () => {
        await teardownTestContext(ctx);
    });

    it('testPinShowsIcon', async () => {
        ctx = await setupTestContext({ emailPrefix: 'pin', urlIdLabel: 'pin-icon' });
        const userSso = ctx.ssoFor('userA');
        const adminSso = ctx.ssoFor('admin', { isAdmin: true });

        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Pin me',
            ssoToken: userSso,
        });
        await pinComment(ctx.tenant, seededId, adminSso);

        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: userSso });
        const { queryByTestId, unmount } = render(<FastCommentsLiveCommenting config={config} />);
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId(`pinIcon-${seededId}`), {
            timeoutMs: 15000,
            label: `pinIcon-${seededId} visible`,
        });
    });

    it('testLockShowsIcon', async () => {
        ctx = await setupTestContext({ emailPrefix: 'lock', urlIdLabel: 'lock-icon' });
        const userSso = ctx.ssoFor('userA');
        const adminSso = ctx.ssoFor('admin', { isAdmin: true });

        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Lock me',
            ssoToken: userSso,
        });
        await lockComment(ctx.tenant, seededId, adminSso);

        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: userSso });
        const { queryByTestId, unmount } = render(<FastCommentsLiveCommenting config={config} />);
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId(`lockIcon-${seededId}`), {
            timeoutMs: 15000,
            label: `lockIcon-${seededId} visible`,
        });
    });

    it('testFlagViaMenu', async () => {
        ctx = await setupTestContext({ emailPrefix: 'flag', urlIdLabel: 'flag-via-menu' });
        // userA posts a comment, userB views and flags it. canBlockOrFlag
        // requires the viewer not be the author.
        const userASso = ctx.ssoFor('userA');
        const userBSso = ctx.ssoFor('userB');
        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Flag this',
            ssoToken: userASso,
        });

        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: userBSso });
        const { queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByText('Flag this'), {
            timeoutMs: 15000,
            label: 'comment to flag visible',
        });

        await pollUntil(() => !!queryByTestId(`commentMenuButton-${seededId}`), {
            timeoutMs: 5000,
            label: 'menu button visible (userB has block/flag rights)',
        });
        fireEvent.press(queryByTestId(`commentMenuButton-${seededId}`)!);

        await pollUntil(() => !!queryByTestId('menuItem-flag'), {
            timeoutMs: 5000,
            label: 'menuItem-flag visible',
        });
        fireEvent.press(queryByTestId('menuItem-flag')!);

        // Comment must remain visible (flagging does not remove or hide it).
        // Allow a beat for any animations / state to settle.
        await new Promise((r) => setTimeout(r, 500));
        expect(queryByText('Flag this')).not.toBeNull();
    });

    it('testBlockShowsBlockedText and testUnblockRestoresComment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'block', urlIdLabel: 'block-flow' });
        const userASso = ctx.ssoFor('userA');
        const userBSso = ctx.ssoFor('userB');
        const seededId = await seedComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Original from A',
            ssoToken: userASso,
        });

        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: userBSso });
        const { queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByText('Original from A'), {
            timeoutMs: 15000,
            label: 'A comment visible to B',
        });

        // Block userA via menu.
        await pollUntil(() => !!queryByTestId(`commentMenuButton-${seededId}`), {
            timeoutMs: 5000,
            label: 'menu button visible',
        });
        fireEvent.press(queryByTestId(`commentMenuButton-${seededId}`)!);
        await pollUntil(() => !!queryByTestId('menuItem-block'), {
            timeoutMs: 5000,
            label: 'menuItem-block visible',
        });
        fireEvent.press(queryByTestId('menuItem-block')!);

        // NOTE: The RN SDK's block menu item runs `setCommentBlockedStatus`
        // immediately - it does NOT show an Alert.alert confirmation that the
        // Android SDK shows. Tracked as an SDK gap; for the test we just verify
        // the block takes effect.

        // After block, the original text should be replaced by the
        // YOU_BLOCKED_THIS_USER translation and the original text should be gone.
        await pollUntil(() => queryByText('Original from A') === null, {
            timeoutMs: 15000,
            label: 'original text replaced after block',
        });

        // Unblock via the menu (now the menu shows "Unblock User").
        fireEvent.press(queryByTestId(`commentMenuButton-${seededId}`)!);
        await pollUntil(() => !!queryByTestId('menuItem-unblock'), {
            timeoutMs: 5000,
            label: 'menuItem-unblock visible',
        });
        fireEvent.press(queryByTestId('menuItem-unblock')!);

        await pollUntil(() => !!queryByText('Original from A'), {
            timeoutMs: 15000,
            label: 'original text restored after unblock',
        });
    });
});
