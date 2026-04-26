/**
 * Verifies the periodic feed-stats refresh: while the FastCommentsFeed is
 * mounted and its WebSocket is connected, an interval poll calls
 * /feed-posts/{tenantId}/stats and merges fresh `commentCount` + `reacts`
 * into the local feed cache.
 *
 * Setup mirrors the dual-instance feed test:
 *  1. A creates a post.
 *  2. B's tree shows the same post via the WS new-feed-post broadcast.
 *  3. We seed a comment on B's side against the post (urlId = "post:<postId>",
 *     same convention used by the Android CommentsDialog).
 *  4. With a 1s polling interval, A's store should pick up the new
 *     `commentCount` within a couple of ticks.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import type { FastCommentsStore } from '../../src/store/types';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';
import { clearAlerts } from '../framework/harness/alert-helper';

interface TestInstanceLike {
    props: Record<string, unknown>;
    parent: TestInstanceLike | null;
}

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

maybe('Feed stats polling', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('refreshes commentCount via the polling tick when a comment is seeded', async () => {
        ctx = await setupTestContext({ emailPrefix: 'feed-stats', urlIdLabel: 'feed-stats' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });

        // Capture A's store via the test-only onStoreReady hook so we can
        // assert directly on the merged stats. There's no testID for
        // commentCount in the row; the polling effect is observed via state.
        let storeA: FastCommentsStore | undefined;
        const onStoreReadyA = (s: FastCommentsStore) => {
            storeA = s;
        };

        // 1s poll cadence keeps the test under the jest deadline. Default in
        // production is 30s.
        const a = render(<FastCommentsFeed config={cfgA} statsPollIntervalMs={1000} onStoreReady={onStoreReadyA} />);
        const b = render(<FastCommentsFeed config={cfgB} statsPollIntervalMs={1000} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

        await pollUntil(
            () =>
                !!a.queryByTestId('postContentEditText') &&
                !!a.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: 'A composer + recycler ready' }
        );
        await pollUntil(
            () =>
                !!b.queryByTestId('postContentEditText') &&
                !!b.queryByTestId('recyclerViewFeed'),
            { timeoutMs: 15000, label: 'B composer + recycler ready' }
        );
        // Allow the WS to attach so the cross-instance new-feed-post event is delivered.
        await sleep(500);

        const postText = `Stats post from B ${Date.now()}`;
        changeTextViaProp(b.getByTestId('postContentEditText'), postText);
        pressViaProp(b.getByTestId('submitPostButton'));

        // B sees its own post locally (composer optimistically inserts).
        await pollUntil(() => !!b.queryByText(postText), {
            timeoutMs: 15000,
            label: "B sees its own post (locally inserted)",
        });

        // A sees the new-posts banner via WS, then taps it to load B's post.
        await pollUntil(() => !!a.queryByTestId('newPostsBanner'), {
            timeoutMs: 15000,
            label: 'A sees newPostsBanner via WS',
        });
        pressViaProp(a.getByTestId('newPostsBanner'));
        await pollUntil(() => !!a.queryByText(postText), {
            timeoutMs: 15000,
            label: "A sees B's post text after banner tap",
        });

        // Pull the post id off A's store so we can address it with the
        // post: urlId convention used by the comments backend.
        if (!storeA) throw new Error('storeA not set by onStoreReady');
        const postIds = storeA.getState().feedPostOrder;
        expect(postIds.length).toBeGreaterThan(0);
        const postId = postIds[0];
        const initialCount = storeA.getState().feedPostsById[postId]?.commentCount ?? 0;

        // Seed a comment against the post via the public comments endpoint.
        await seedComment({
            tenant: ctx.tenant,
            urlId: `post:${postId}`,
            text: `Comment on stats post ${Date.now()}`,
            ssoToken: ssoB,
        });

        // A's poll tick (1s) should pick up the new count within a few seconds.
        await pollUntil(
            () => {
                if (!storeA) return false;
                const cur = storeA.getState().feedPostsById[postId]?.commentCount ?? 0;
                return cur > initialCount;
            },
            { timeoutMs: 10000, label: "A's commentCount reflects the new comment via poll tick" }
        );

        const finalCount = storeA.getState().feedPostsById[postId]?.commentCount ?? 0;
        expect(finalCount).toBeGreaterThan(initialCount);
    }, 120000);
});
