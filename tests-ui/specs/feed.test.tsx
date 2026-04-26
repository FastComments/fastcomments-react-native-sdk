/**
 * Ports FeedUserA_UITests + FeedUserB_UITests -> RN SDK as a single
 * dual-instance scenario:
 *  Phase 1 - B types a post via the composer + submits; A's tree shows the
 *            "Show N new posts" banner via a `new-feed-post` WS event; A taps
 *            the banner; A's recyclerViewFeed contains B's text.
 *  Phase 2 - A types a post + submits; B's tree shows the banner; B taps it;
 *            B's recyclerViewFeed contains A's text.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { clearAlerts } from '../framework/harness/alert-helper';

// Minimal local type shim: @types/react-test-renderer is not installed for the
// SDK and we only need `props` + `parent` for our prop-walking helpers.
interface TestInstanceLike {
    props: Record<string, unknown>;
    parent: TestInstanceLike | null;
}

/**
 * Walks the host element up to the nearest composite ancestor carrying
 * `onPress` and invokes it inside `act()`. We do not use `fireEvent.press`
 * because under the RN jest preset the Pressability responder state machine
 * sometimes drops the press once the tree has re-rendered (e.g. after a
 * banner tap that triggers a `clearFeedNewPostsCount` + reload). Calling the
 * onPress prop directly mirrors what the Android espresso `perform(click())`
 * does at the touch handler layer.
 */
function pressViaProp(element: TestInstanceLike) {
    let cursor: TestInstanceLike | null = element;
    while (cursor) {
        const onPress = cursor.props?.onPress;
        if (typeof onPress === 'function') {
            const fn = onPress as () => void;
            act(() => {
                fn();
            });
            return;
        }
        cursor = cursor.parent;
    }
    throw new Error('No onPress prop found in the ancestor chain');
}

/**
 * Same rationale as `pressViaProp`: directly invoke `onChangeText` instead of
 * using `fireEvent.changeText`, which is unreliable on this tree once it has
 * re-rendered (the host-component-name detection sometimes silently drops the
 * event for a TextInput that re-mounted).
 */
function changeTextViaProp(element: TestInstanceLike, value: string) {
    const onChangeText = element.props?.onChangeText;
    if (typeof onChangeText !== 'function') {
        throw new Error('Element does not have an onChangeText prop');
    }
    const fn = onChangeText as (v: string) => void;
    act(() => {
        fn(value);
    });
}

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Feed (dual-instance)', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('FeedUserA + FeedUserB - banner-driven post visibility', async () => {
        ctx = await setupTestContext({ emailPrefix: 'feed', urlIdLabel: 'feed' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });
        const a = render(<FastCommentsFeed config={cfgA} />);
        const b = render(<FastCommentsFeed config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        // Both should mount: either the recycler is displayed (with empty
        // state) or the composer is visible. Use the composer testIDs since
        // they're always rendered once the initial load completes.
        await pollUntil(
            () => !!a.queryByTestId('postContentEditText') &&
                !!a.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: "A composer + recycler ready" }
        );
        await pollUntil(
            () => !!b.queryByTestId('postContentEditText') &&
                !!b.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: "B composer + recycler ready" }
        );
        // Both A and B must have an emptyStateView in their initial recycler.
        await pollUntil(() => !!a.queryByTestId('emptyStateView'), {
            timeoutMs: 5000,
            label: "A emptyStateView visible",
        });
        await pollUntil(() => !!b.queryByTestId('emptyStateView'), {
            timeoutMs: 5000,
            label: "B emptyStateView visible",
        });
        // Allow B's WebSocket subscription to attach before B sends so A
        // doesn't miss the broadcast.
        await sleep(500);

        // === Phase 1: B posts, A sees banner + content ===
        const bText = `Feed post from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('postContentEditText'), bText);
        pressViaProp(b.getByTestId('submitPostButton'));

        await pollUntil(() => !!b.queryByText(bText), {
            timeoutMs: 15000,
            label: "B sees its own post (locally inserted)",
        });

        await pollUntil(() => !!a.queryByTestId('newPostsBanner'), {
            timeoutMs: 15000,
            label: "A sees newPostsBanner via WS",
        });

        pressViaProp(a.getByTestId('newPostsBanner'));

        await pollUntil(() => !!a.queryByText(bText), {
            timeoutMs: 15000,
            label: "A sees B's post text after banner tap",
        });

        // === Phase 2: A posts, B sees banner + content ===
        await sleep(500);
        const aText = `Feed post from A ${Date.now()}`;
        changeTextViaProp(a.getByTestId('postContentEditText'), aText);
        await sleep(100);
        pressViaProp(a.getByTestId('submitPostButton'));

        await pollUntil(() => !!a.queryByText(aText), {
            timeoutMs: 15000,
            label: "A sees its own post (locally inserted)",
        });

        await pollUntil(() => !!b.queryByTestId('newPostsBanner'), {
            timeoutMs: 15000,
            label: "B sees newPostsBanner via WS",
        });

        pressViaProp(b.getByTestId('newPostsBanner'));

        await pollUntil(() => !!b.queryByText(aText), {
            timeoutMs: 15000,
            label: "B sees A's post text after banner tap",
        });
    }, 180000);
});
