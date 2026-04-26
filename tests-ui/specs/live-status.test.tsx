/**
 * Tests for the chat-style live-status header strip (`config.showLiveStatus`).
 *
 * Mirrors the LiveChat connectionStatusText / userCountText assertions that
 * Android exercises. Two scenarios:
 *  1. Single instance - WebSocket connects, the LIVE chip text resolves to
 *     translations.LIVE.
 *  2. Two instances - both connect, A's user-count chip reaches >= 2.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { textOf } from '../framework/harness/text-of';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Live status bar (chat-style header)', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('testConnectionStatusShowsLive', async () => {
        ctx = await setupTestContext({ emailPrefix: 'live-status', urlIdLabel: 'live-status' });
        const ssoToken = ctx.ssoFor('userA');
        const overrides = { showLiveStatus: true };
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken, overrides });
        const { queryByTestId, getByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('connectionStatusText'), {
            timeoutMs: 15000,
            label: 'connectionStatusText rendered',
        });

        // Wait for the WS to connect; once connected the LIVE translation should be displayed.
        await pollUntil(
            () => {
                const node = queryByTestId('connectionStatusText');
                if (!node) return false;
                const text = textOf(node).trim();
                return text.length > 0 && text.toLowerCase() === 'live';
            },
            { timeoutMs: 30000, label: 'connectionStatusText reads Live' }
        );

        const finalText = textOf(getByTestId('connectionStatusText')).trim();
        expect(finalText.toLowerCase()).toBe('live');
    }, 90000);

    it('testUserCountShowsTwo', async () => {
        ctx = await setupTestContext({ emailPrefix: 'user-count', urlIdLabel: 'user-count' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const overrides = { showLiveStatus: true };
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA, overrides });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB, overrides });
        const a = render(<FastCommentsLiveCommenting config={cfgA} />);
        const b = render(<FastCommentsLiveCommenting config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        // Both instances must mount and connect.
        await pollUntil(() => !!a.queryByTestId('connectionStatusText'), {
            timeoutMs: 15000,
            label: 'A connectionStatusText rendered',
        });
        await pollUntil(() => !!b.queryByTestId('connectionStatusText'), {
            timeoutMs: 15000,
            label: 'B connectionStatusText rendered',
        });
        // Allow the WebSockets to attach and the presence broadcast to propagate.
        await sleep(1000);

        await pollUntil(
            () => {
                const node = a.queryByTestId('userCountText');
                if (!node) return false;
                const text = textOf(node);
                const match = text.match(/\d+/);
                if (!match) return false;
                return parseInt(match[0], 10) >= 2;
            },
            { timeoutMs: 30000, label: "A's userCountText reaches >= 2" }
        );
    }, 120000);
});
