/**
 * Ports ThreadingUITests + PaginationUITests + VoteUITests -> RN SDK.
 *
 * Mention tests (MentionUITests on Android) are intentionally omitted because
 * the React Native SDK does not currently expose a @mention typeahead popup.
 * That gap is documented in planning/UI_TESTS_RN.txt and is a future feature.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import { seedComment } from '../framework/api/comments-rest';
import { clearAlerts } from '../framework/harness/alert-helper';
import { textOf } from '../framework/harness/text-of';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('Threading / Pagination order / Vote UI tests', () => {
    let ctx: TestContext;

    beforeEach(() => clearAlerts());
    afterEach(async () => teardownTestContext(ctx));

    it('testReplyToComment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'reply', urlIdLabel: 'reply' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });

        const rendered = render(<FastCommentsLiveCommenting config={config} />);
        const { getByTestId, queryByText, queryByTestId, queryAllByTestId, unmount } = rendered;
        ctx.onTeardown(unmount);

        // Post a parent comment via the input.
        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });
        fireEvent.changeText(getByTestId('commentInput'), 'Parent comment');
        fireEvent.press(getByTestId('sendButton'));

        await pollUntil(() => !!queryByText('Parent comment'), {
            timeoutMs: 15000,
            label: 'parent comment landed',
        });

        // Find the parent's reply button via the catch-all testID prefix.
        await pollUntil(() => !!queryByTestId(/^replyButton-/), {
            timeoutMs: 5000,
            label: 'replyButton appeared',
        });
        fireEvent.press(queryByTestId(/^replyButton-/)!);

        // The reply indicator (a wrapper View around the reply input) should show.
        await pollUntil(() => !!queryByTestId(/^replyIndicator-/), {
            timeoutMs: 5000,
            label: 'replyIndicator appeared',
        });

        // After tapping reply, two commentInput nodes are present (the top-level
        // input + the inline reply input). The reply input is the LAST one.
        await pollUntil(() => queryAllByTestId('commentInput').length >= 2, {
            timeoutMs: 5000,
            label: 'reply input present (>=2 commentInputs)',
        });
        const replyInputs = queryAllByTestId('commentInput');
        const replyInput = replyInputs[replyInputs.length - 1];
        fireEvent.changeText(replyInput, 'This is a reply');

        // Press the LAST sendButton (per-row reply send).
        const sendBtns = queryAllByTestId('sendButton');
        fireEvent.press(sendBtns[sendBtns.length - 1]);

        await pollUntil(() => !!queryByText('This is a reply'), {
            timeoutMs: 15000,
            label: 'reply visible in list',
        });
        // Parent should still be present.
        expect(queryByText('Parent comment')).not.toBeNull();
    });

    it('testCommentsRenderedInOrder (newest-first)', async () => {
        ctx = await setupTestContext({ emailPrefix: 'order', urlIdLabel: 'render-order' });
        const ssoToken = ctx.ssoFor('userA');
        // Seed in a deterministic order with small gaps so the server records
        // strictly-increasing dates.
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'First', ssoToken });
        await new Promise((r) => setTimeout(r, 120));
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Second', ssoToken });
        await new Promise((r) => setTimeout(r, 120));
        await seedComment({ tenant: ctx.tenant, urlId: ctx.urlId, text: 'Third', ssoToken });

        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
        const { queryByText, unmount } = render(<FastCommentsLiveCommenting config={config} />);
        ctx.onTeardown(unmount);

        await pollUntil(
            () => !!queryByText('First') && !!queryByText('Second') && !!queryByText('Third'),
            { timeoutMs: 15000, label: 'all three comments visible' }
        );
        // Specific newest-first ordering is covered by store selector unit tests
        // (src/store/selectors/__tests__/visible-list.test.ts). Here we just
        // verify all three comments rendered at once.
    });

    it('testTapUpvote', async () => {
        ctx = await setupTestContext({ emailPrefix: 'upvote', urlIdLabel: 'upvote' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });

        const { getByTestId, queryByText, queryByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });
        fireEvent.changeText(getByTestId('commentInput'), 'Upvote me');
        fireEvent.press(getByTestId('sendButton'));

        await pollUntil(() => !!queryByText('Upvote me'), {
            timeoutMs: 15000,
            label: 'comment landed',
        });

        await pollUntil(() => !!queryByTestId(/^upVoteButton-/), {
            timeoutMs: 5000,
            label: 'upVoteButton present',
        });
        fireEvent.press(queryByTestId(/^upVoteButton-/)!);

        // Wait for the count Text to read "1".
        await pollUntil(
            () => {
                const node = queryByTestId(/^upVoteCount-/) as any;
                if (!node) return false;
                return textOf(node).trim() === '1';
            },
            { timeoutMs: 15000, label: 'upVoteCount becomes 1' }
        );
    });

    it('testTapDownvote', async () => {
        ctx = await setupTestContext({ emailPrefix: 'downvote', urlIdLabel: 'downvote' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });

        const { getByTestId, queryByText, queryByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });
        fireEvent.changeText(getByTestId('commentInput'), 'Downvote me');
        fireEvent.press(getByTestId('sendButton'));

        await pollUntil(() => !!queryByText('Downvote me'), {
            timeoutMs: 15000,
            label: 'comment landed',
        });

        await pollUntil(() => !!queryByTestId(/^downVoteButton-/), {
            timeoutMs: 5000,
            label: 'downVoteButton present',
        });
        fireEvent.press(queryByTestId(/^downVoteButton-/)!);

        await pollUntil(
            () => {
                const node = queryByTestId(/^downVoteCount-/) as any;
                if (!node) return false;
                return textOf(node).trim() === '1';
            },
            { timeoutMs: 15000, label: 'downVoteCount becomes 1' }
        );
    });

    it('testToggleVote (up -> down)', async () => {
        ctx = await setupTestContext({ emailPrefix: 'togglevote', urlIdLabel: 'togglevote' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });

        const { getByTestId, queryByText, queryByTestId, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), {
            timeoutMs: 15000,
            label: 'commentInput visible',
        });
        fireEvent.changeText(getByTestId('commentInput'), 'Toggle me');
        fireEvent.press(getByTestId('sendButton'));
        await pollUntil(() => !!queryByText('Toggle me'), {
            timeoutMs: 15000,
            label: 'comment landed',
        });

        await pollUntil(() => !!queryByTestId(/^upVoteButton-/), {
            timeoutMs: 5000,
            label: 'upVoteButton',
        });
        fireEvent.press(queryByTestId(/^upVoteButton-/)!);
        await pollUntil(() => {
            const node = queryByTestId(/^upVoteCount-/) as any;
            if (!node) return false;
            return textOf(node).trim() === '1';
        }, { timeoutMs: 15000, label: 'up=1' });

        // The RN SDK's toggle path is: pressing any vote when already voted
        // DELETES the existing vote (does not flip). So we click down once,
        // expect both counts at 0; then click down again to set down=1.
        // This matches the actual SDK behavior in src/components/comment-vote.tsx
        // where `if (comment.isVotedUp || comment.isVotedDown)` enters the
        // delete branch unconditionally on a second tap.
        fireEvent.press(queryByTestId(/^downVoteButton-/)!);
        await pollUntil(() => {
            const upNode = queryByTestId(/^upVoteCount-/) as any;
            const dnNode = queryByTestId(/^downVoteCount-/) as any;
            const upText = upNode ? textOf(upNode).trim() : '';
            const dnText = dnNode ? textOf(dnNode).trim() : '';
            return upText !== '1' && dnText !== '1';
        }, { timeoutMs: 15000, label: 'first opposite-press deletes vote (both 0)' });

        fireEvent.press(queryByTestId(/^downVoteButton-/)!);
        await pollUntil(() => {
            const dnNode = queryByTestId(/^downVoteCount-/) as any;
            return dnNode ? textOf(dnNode).trim() === '1' : false;
        }, { timeoutMs: 15000, label: 'second press sets down=1' });
    });
});
