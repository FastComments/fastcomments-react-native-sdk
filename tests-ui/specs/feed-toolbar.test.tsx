/**
 * Verifies the `customToolbarButtons` API on `<FastCommentsFeed>` renders
 * host-supplied buttons on each post row, fires `onPress` with the right
 * `FeedPost`, and respects the `visible` predicate.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import type { FeedCustomToolbarButton } from '../../src/types/feed-custom-toolbar-button';
import type { FeedPost } from '../../src/types/feed-post';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import { clearAlerts } from '../framework/harness/alert-helper';
import { seedFeedPost } from '../framework/api/feed-rest';

interface TestInstanceLike {
    props: Record<string, unknown>;
    parent: TestInstanceLike | null;
}

/**
 * Walk the host element up to the nearest composite ancestor with `onPress`
 * and invoke it inside `act()`. Same rationale as `feed.test.tsx`: under the
 * RN jest preset Pressability sometimes drops `fireEvent.press` after the
 * tree re-renders, so we call the prop directly.
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

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Feed custom toolbar buttons', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('renders host buttons, fires onPress with the post, and hides invisible buttons', async () => {
        ctx = await setupTestContext({ emailPrefix: 'feed-toolbar', urlIdLabel: 'feed-toolbar' });
        const sso = ctx.ssoFor('userA');

        // Seed BEFORE rendering: the head load on mount picks the post up
        // without needing a websocket round-trip.
        const seededId = await seedFeedPost({
            tenant: ctx.tenant,
            ssoToken: sso,
            title: 'Toolbar test post',
            contentHTML: '<p>seeded by feed-toolbar test</p>',
        });

        const presses: Array<{ buttonId: string; postId: string }> = [];
        const buttons: FeedCustomToolbarButton[] = [
            {
                id: 'share',
                label: 'Share',
                onPress: (post: FeedPost) => {
                    presses.push({ buttonId: 'share', postId: post.id });
                },
            },
            {
                id: 'bookmark',
                label: (post: FeedPost) => `Save ${post.id.slice(-3)}`,
                onPress: (post: FeedPost) => {
                    presses.push({ buttonId: 'bookmark', postId: post.id });
                },
            },
            {
                id: 'hidden',
                label: 'Hidden',
                visible: () => false,
                onPress: () => {
                    presses.push({ buttonId: 'hidden', postId: 'should-not-fire' });
                },
            },
        ];

        const cfg = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: sso });
        const tree = render(<FastCommentsFeed config={cfg} customToolbarButtons={buttons} />);
        ctx.onTeardown(() => tree.unmount());

        await pollUntil(
            () => !!tree.queryByTestId(`feedPostRow-${seededId}`),
            { timeoutMs: 15000, label: 'seeded post row visible' }
        );

        // Both visible buttons must render.
        const shareNode = tree.getByTestId(`feedCustomToolbarButton-${seededId}-share`);
        const bookmarkNode = tree.getByTestId(`feedCustomToolbarButton-${seededId}-bookmark`);
        expect(shareNode).toBeTruthy();
        expect(bookmarkNode).toBeTruthy();

        // The hidden button must NOT render.
        expect(tree.queryByTestId(`feedCustomToolbarButton-${seededId}-hidden`)).toBeNull();

        // Tap "share" - host's onPress should fire with the right post id.
        pressViaProp(shareNode as unknown as TestInstanceLike);
        expect(presses).toEqual([{ buttonId: 'share', postId: seededId }]);

        // Tap "bookmark" - same expectation.
        pressViaProp(bookmarkNode as unknown as TestInstanceLike);
        expect(presses).toEqual([
            { buttonId: 'share', postId: seededId },
            { buttonId: 'bookmark', postId: seededId },
        ]);
    }, 60000);
});
