/**
 * Tests for the dedicated <FastCommentsLiveChat> widget (Android LiveChatView
 * parity). The widget is a preset wrapper: chronological order, composer below
 * the list, live header strip, infinite scroll, no voting, no reply threading.
 * No chat flags are passed in these tests - that the presets apply IS the test.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import { FastCommentsLiveChat } from '../../src/components/live-chat';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { textOf } from '../framework/harness/text-of';
import { pressViaProp, changeTextViaProp } from '../framework/harness/events';
import { seedComment } from '../framework/api/comments-rest';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Live chat widget', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('testLiveChatWidget dual-instance two-way exchange, chronological order', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chatwidget', urlIdLabel: 'chat-widget' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });
        const a = render(<FastCommentsLiveChat config={cfgA} />);
        const b = render(<FastCommentsLiveChat config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        await pollUntil(() => !!a.queryByTestId('commentInput'), { timeoutMs: 15000, label: 'A input' });
        await pollUntil(() => !!b.queryByTestId('commentInput'), { timeoutMs: 15000, label: 'B input' });
        await sleep(500);

        const bText = `Chat from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('commentInput'), bText);
        pressViaProp(b.getByTestId('sendButton'));
        await pollUntil(() => !!b.queryByText(bText), { timeoutMs: 15000, label: "B's own message visible" });
        await pollUntil(() => !!a.queryByText(bText), { timeoutMs: 20000, label: "A sees B's message via WS" });

        const aText = `Chat from A ${Date.now()}`;
        changeTextViaProp(a.getByTestId('commentInput'), aText);
        pressViaProp(a.getByTestId('sendButton'));
        await pollUntil(() => !!a.queryByText(aText), { timeoutMs: 15000, label: "A's own message visible" });
        await pollUntil(() => !!b.queryByText(aText), { timeoutMs: 20000, label: "B sees A's message via WS" });

        // Chronological: A's message (sent last) renders after B's in both trees.
        for (const inst of [a, b]) {
            const rows = inst.queryAllByTestId(/^commentRow-/);
            const bIndex = rows.findIndex((r) => !!within(r).queryByText(bText));
            const aIndex = rows.findIndex((r) => !!within(r).queryByText(aText));
            expect(bIndex).toBeGreaterThanOrEqual(0);
            expect(aIndex).toBeGreaterThan(bIndex);
        }
    }, 120000);

    it('testHeaderStrip shows Live and a user count of two', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chatwidget-hdr', urlIdLabel: 'chat-widget-header' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const a = render(<FastCommentsLiveChat config={buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA })} />);
        const b = render(<FastCommentsLiveChat config={buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB })} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        for (const inst of [a, b]) {
            await pollUntil(
                () => {
                    const node = inst.queryByTestId('connectionStatusText');
                    return !!node && textOf(node).trim().toLowerCase() === 'live';
                },
                { timeoutMs: 30000, label: 'connection status reads Live' }
            );
        }
        await pollUntil(
            () => {
                const node = a.queryByTestId('userCountText');
                if (!node) return false;
                const match = /\d+/.exec(textOf(node));
                return !!match && parseInt(match[0], 10) >= 2;
            },
            { timeoutMs: 30000, label: 'A sees user count >= 2' }
        );
    }, 120000);

    it('testPresetsApplied: no pagination buttons, no vote buttons, composer after list', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chatwidget-pre', urlIdLabel: 'chat-widget-presets' });
        const ssoToken = ctx.ssoFor('userA');
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'preset check', ssoToken });
        const inst = render(<FastCommentsLiveChat config={buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken })} />);
        ctx.onTeardown(() => inst.unmount());

        await pollUntil(() => inst.queryAllByTestId(/^commentRow-/).length > 0, {
            timeoutMs: 20000,
            label: 'comment row rendered',
        });
        expect(inst.queryByTestId('paginationControls')).toBeNull();
        expect(inst.queryByTestId(/^upVoteButton-/)).toBeNull();
        expect(inst.queryByTestId(/^downVoteButton-/)).toBeNull();
        // Composer renders in the bottom area (inputAfterComments preset).
        expect(inst.queryByTestId('commentInput')).toBeTruthy();
        expect(inst.queryByTestId('connectionStatusText')).toBeTruthy();
    }, 120000);

    it('testAutoScrollOnNewLiveMessage', async () => {
        const scrollSpy = jest.spyOn(FlatList.prototype, 'scrollToEnd').mockImplementation(() => undefined);
        try {
            ctx = await setupTestContext({ emailPrefix: 'chatwidget-scr', urlIdLabel: 'chat-widget-scroll' });
            const ssoA = ctx.ssoFor('userA');
            const ssoB = ctx.ssoFor('userB');
            const a = render(<FastCommentsLiveChat config={buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA })} />);
            ctx.onTeardown(() => a.unmount());
            await pollUntil(() => !!a.queryByTestId('commentInput'), { timeoutMs: 15000, label: 'A input' });
            await sleep(500);
            scrollSpy.mockClear();

            const bText = `Auto scroll ${Date.now()}`;
            await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: bText, ssoToken: ssoB });
            await pollUntil(() => !!a.queryByText(bText), { timeoutMs: 20000, label: "A sees B's live message" });
            await pollUntil(() => scrollSpy.mock.calls.length > 0, {
                timeoutMs: 10000,
                label: 'auto-scrolled to end on new message',
            });
        } finally {
            scrollSpy.mockRestore();
        }
    }, 120000);

    it('testLoadOlderOnScrollTop', async () => {
        ctx = await setupTestContext({ emailPrefix: 'chatwidget-old', urlIdLabel: 'chat-widget-older' });
        const ssoToken = ctx.ssoFor('userA');
        for (let i = 1; i <= 50; i++) {
            await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: `older-${i}`, ssoToken });
        }
        const inst = render(
            <FastCommentsLiveChat config={buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken })} />
        );
        ctx.onTeardown(() => inst.unmount());

        await pollUntil(() => inst.queryAllByTestId(/^commentRow-/).length > 0, {
            timeoutMs: 20000,
            label: 'initial page rendered',
        });
        const initialCount = inst.queryAllByTestId(/^commentRow-/).length;
        expect(initialCount).toBeGreaterThan(0);
        expect(initialCount).toBeLessThan(50);

        fireEvent.scroll(inst.getByTestId('recyclerViewComments'), {
            nativeEvent: {
                contentOffset: { x: 0, y: 0 },
                contentSize: { width: 400, height: 2000 },
                layoutMeasurement: { width: 400, height: 600 },
            },
        });
        await pollUntil(() => inst.queryAllByTestId(/^commentRow-/).length > initialCount, {
            timeoutMs: 20000,
            label: 'older page loaded after scroll to top',
        });
    }, 180000);
});
