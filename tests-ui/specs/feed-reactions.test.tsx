/**
 * Feed reactions: dual-instance scenario.
 *  Phase 1 - A creates a post via the composer; B sees it via the new-posts
 *            banner; B taps the picker, picks the heart, A's chip shows count
 *            "1" via the live `fr` event.
 *  Phase 2 - B taps the same chip again to undo; A's chip disappears (count
 *            falls back to zero so the chip is hidden) via the live `dfr`
 *            event.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { clearAlerts } from '../framework/harness/alert-helper';
import { textOf } from '../framework/harness/text-of';

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

maybe('Feed reactions (dual-instance)', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('B reacts on A\'s post; A sees count via WS; B undoes; count clears', async () => {
        ctx = await setupTestContext({ emailPrefix: 'reactions', urlIdLabel: 'reactions' });
        const ssoA = ctx.ssoFor('userA');
        const ssoB = ctx.ssoFor('userB');
        const cfgA = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoA });
        const cfgB = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken: ssoB });
        const a = render(<FastCommentsFeed config={cfgA} />);
        const b = render(<FastCommentsFeed config={cfgB} />);
        ctx.onTeardown(() => a.unmount());
        ctx.onTeardown(() => b.unmount());

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
        await sleep(500);

        // A creates a post.
        const aText = `Reactions probe ${Date.now()}`;
        changeTextViaProp(a.getByTestId('postContentEditText'), aText);
        pressViaProp(a.getByTestId('submitPostButton'));

        await pollUntil(() => !!a.queryByText(aText), {
            timeoutMs: 15000,
            label: "A sees own post",
        });

        // B receives the new-posts banner over WS, taps it to load the post.
        await pollUntil(() => !!b.queryByTestId('newPostsBanner'), {
            timeoutMs: 20000,
            label: "B sees newPostsBanner via WS",
        });
        pressViaProp(b.getByTestId('newPostsBanner'));
        await pollUntil(() => !!b.queryByText(aText), {
            timeoutMs: 15000,
            label: "B sees A's post text after banner tap",
        });

        // Resolve the post id from B's loaded list. The reactions component
        // wraps a testID `feedPostReactions-{postId}`; we walk from the matching
        // post row up via the testID prefix.
        const reactionsWrappers = b.UNSAFE_root.findAll(
            (n) =>
                typeof (n.props as { testID?: unknown }).testID === 'string' &&
                ((n.props as { testID: string }).testID).startsWith('feedPostReactions-')
        );
        if (reactionsWrappers.length === 0) {
            throw new Error('No feedPostReactions wrapper rendered');
        }
        const wrapperTestId = (reactionsWrappers[0].props as { testID: string }).testID;
        const postId = wrapperTestId.replace('feedPostReactions-', '');

        // B opens the picker and selects heart.
        const pickerBtn = b.getByTestId(`feedReactionPickerButton-${postId}`);
        pressViaProp(pickerBtn);
        await pollUntil(() => !!b.queryByTestId('feedReactionPickerItem-h'), {
            timeoutMs: 5000,
            label: "B picker open",
        });
        pressViaProp(b.getByTestId('feedReactionPickerItem-h'));

        // B's local chip first via the optimistic update so we know the
        // submit + state path executed before we hold A on the WS event.
        await pollUntil(
            () => {
                const counter = b.queryByTestId(`feedReactionChipCount-${postId}-h`);
                if (!counter) return false;
                return textOf(counter).trim() === '1';
            },
            { timeoutMs: 10000, label: "B's heart chip shows count 1 (optimistic)" }
        );

        // A's chip should appear with count 1 via the `fr` WS event.
        await pollUntil(
            () => {
                const counter = a.queryByTestId(`feedReactionChipCount-${postId}-h`);
                if (!counter) return false;
                return textOf(counter).trim() === '1';
            },
            { timeoutMs: 20000, label: "A's heart chip shows count 1 (live)" }
        );

        // B taps own chip to undo; chip should disappear from A's tree.
        pressViaProp(b.getByTestId(`feedReactionChip-${postId}-h`));

        await pollUntil(
            () => !a.queryByTestId(`feedReactionChip-${postId}-h`),
            { timeoutMs: 20000, label: "A's heart chip removed after B undo" }
        );
        await pollUntil(
            () => !b.queryByTestId(`feedReactionChip-${postId}-h`),
            { timeoutMs: 5000, label: "B's heart chip removed after own undo" }
        );
    }, 240000);
});
