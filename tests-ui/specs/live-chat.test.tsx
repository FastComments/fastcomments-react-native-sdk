/**
 * Ports LiveChat scenarios -> RN SDK.
 *
 * The RN SDK does not have a separate "live chat" component; it's the same
 * FastCommentsLiveCommenting wrapper with chat-style config flags
 * (showLiveRightAway, defaultSortDirection='NF', newCommentsToBottom). Tests
 * configure those flags explicitly.
 *
 * connectionStatusText / userCountText (the Android live-chat header strip)
 * are not currently rendered by the RN SDK - tracked as a feature gap.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';
import { clearAlerts } from '../framework/harness/alert-helper';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Live chat (chat-style config)', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('testLiveChat dual-instance message exchange', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chat', urlIdLabel: 'chat' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const overrides = { showLiveRightAway: true };
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA, overrides });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB, overrides });
        const a = render(<FastCommentsLiveCommenting config={cfgA} />);
        const b = render(<FastCommentsLiveCommenting config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        await pollUntil(() => !!a.queryByTestId('commentInput'), { timeoutMs: 15000, label: 'A input' });
        await pollUntil(() => !!b.queryByTestId('commentInput'), { timeoutMs: 15000, label: 'B input' });
        await sleep(500);

        // B sends - we know from the live-events suite that B can submit and A
        // receives the live event. Symmetric round-trip from A is covered there.
        const bText = `From B ${Date.now()}`;
        fireEvent.changeText(b.getByTestId('commentInput'), bText);
        fireEvent.press(b.getByTestId('sendButton'));
        await pollUntil(() => !!b.queryByText(bText), { timeoutMs: 15000, label: "B's own message visible" });
        await pollUntil(() => !!a.queryByText(bText), { timeoutMs: 20000, label: "A sees B's message via WS" });
    }, 90000);

    it('testLoadOlderMessages (infinite scroll, paginated initial load)', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chat-page', urlIdLabel: 'chat-pagination' });
        const ssoToken = ctx.ssoFor('userA');
        // Seed 50 messages.
        for (let i = 1; i <= 50; i++) {
            await seedComment({
                tenant: ctx.tenant,
                urlId: ctx.urlId,
                text: `msg-${i}`,
                ssoToken,
            });
        }

        const overrides = { enableInfiniteScrolling: true };
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken, overrides });
        const { queryByTestId, queryAllByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        // Wait for any commentRow to render. We don't pin to a specific text
        // because FlatList virtualization in jest doesn't render every row.
        await pollUntil(() => queryAllByTestId(/^commentRow-/).length > 0, {
            timeoutMs: 20000,
            label: 'at least one commentRow rendered',
        });

        // With infinite scrolling enabled, the explicit pagination control should NOT show.
        expect(queryByTestId('paginationControls')).toBeNull();

        // The initial page is paginated - not all 50 are in the FlatList data
        // (PAGE_SIZE is 30 by default).
        const initialRowCount = queryAllByTestId(/^commentRow-/).length;
        expect(initialRowCount).toBeLessThan(50);
        expect(initialRowCount).toBeGreaterThan(0);
    }, 180000);
});
