/**
 * Parity coverage for customers migrating from the iframe-based react wrapper
 * (idcolab profile): single-like voting (VoteStyle.Heart, custom icon via
 * assets), page reacts above the composer (pageReactConfig), and the inline
 * submit arrow inside the comment box (useInlineSubmitButton).
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { VoteStyle } from 'fastcomments-typescript';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil, sleep } from '../framework/harness/poll';
import { textOf } from '../framework/harness/text-of';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('idcolab parity', () => {
    let ctx: TestContext;

    afterEach(async () => teardownTestContext(ctx));

    it('testHeartVoteStyleSingleLikeToggle', async () => {
        ctx = await setupTestContext({ emailPrefix: 'heartvote', urlIdLabel: 'heart-vote' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            ssoToken,
            overrides: { voteStyle: VoteStyle.Heart },
        });
        const { getByTestId, queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!getByTestId('commentInput'), { timeoutMs: 15000, label: 'commentInput visible' });
        fireEvent.changeText(getByTestId('commentInput'), 'Like me');
        fireEvent.press(getByTestId('sendButton'));
        await pollUntil(() => !!queryByText('Like me'), { timeoutMs: 15000, label: 'comment landed' });

        // Heart style renders ONE like button: no up/down pair.
        await pollUntil(() => !!queryByTestId(/^likeButton-/), { timeoutMs: 5000, label: 'likeButton present' });
        expect(queryByTestId(/^upVoteButton-/)).toBeNull();
        expect(queryByTestId(/^downVoteButton-/)).toBeNull();

        fireEvent.press(queryByTestId(/^likeButton-/)!);
        await pollUntil(() => {
            const node = queryByTestId(/^likeCount-/);
            return !!node && textOf(node).trim() === '1';
        }, { timeoutMs: 15000, label: 'like count becomes 1' });

        // Tapping again un-likes.
        fireEvent.press(queryByTestId(/^likeButton-/)!);
        await pollUntil(() => {
            const node = queryByTestId(/^likeCount-/);
            return !!node && textOf(node).trim() === '0';
        }, { timeoutMs: 15000, label: 'like count back to 0' });
    }, 90000);

    it('testPageReactsToggleAndCount', async () => {
        ctx = await setupTestContext({ emailPrefix: 'pagereact', urlIdLabel: 'page-reacts' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            ssoToken,
            overrides: {
                pageReactConfig: {
                    showUsers: true,
                    reacts: [
                        {
                            id: 'love',
                            src: 'https://cdn.fastcomments.com/images/star-64.png',
                            selectedSrc: 'https://cdn.fastcomments.com/images/star-64-filled.png',
                        },
                    ],
                },
            },
        });
        const { queryByTestId, unmount } = render(<FastCommentsLiveCommenting config={config} />);
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('pageReact-love'), {
            timeoutMs: 15000,
            label: 'page react button rendered',
        });
        await pollUntil(() => {
            const count = queryByTestId('pageReactCount-love');
            return !!count && textOf(count).trim() === '0';
        }, { timeoutMs: 10000, label: 'initial count 0' });

        fireEvent.press(queryByTestId('pageReact-love')!);
        await pollUntil(() => {
            const count = queryByTestId('pageReactCount-love');
            return !!count && textOf(count).trim() === '1';
        }, { timeoutMs: 15000, label: 'count 1 after react' });

        // Survives a reload: the server persisted the react + selection.
        unmount();
        const second = render(<FastCommentsLiveCommenting config={config} />);
        ctx.onTeardown(() => second.unmount());
        await pollUntil(() => {
            const count = second.queryByTestId('pageReactCount-love');
            return !!count && textOf(count).trim() === '1';
        }, { timeoutMs: 15000, label: 'count 1 after reload' });

        // Un-react brings it back down.
        fireEvent.press(second.queryByTestId('pageReact-love')!);
        await pollUntil(() => {
            const count = second.queryByTestId('pageReactCount-love');
            return !!count && textOf(count).trim() === '0';
        }, { timeoutMs: 15000, label: 'count 0 after un-react' });
    }, 120000);

    it('testInlineSubmitButtonPostsComment', async () => {
        ctx = await setupTestContext({ emailPrefix: 'inline-send', urlIdLabel: 'inline-send' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            ssoToken,
            overrides: { useInlineSubmitButton: true },
        });
        const { getByTestId, queryByTestId, queryByText, unmount } = render(
            <FastCommentsLiveCommenting config={config} />
        );
        ctx.onTeardown(unmount);

        await pollUntil(() => !!queryByTestId('commentInput'), { timeoutMs: 15000, label: 'commentInput visible' });
        // The inline arrow replaces the standalone labeled button.
        expect(queryByTestId('inlineSendButton')).toBeTruthy();
        const text = `Inline send ${Date.now()}`;
        fireEvent.changeText(getByTestId('commentInput'), text);
        fireEvent.press(getByTestId('inlineSendButton'));
        await pollUntil(() => !!queryByText(text), { timeoutMs: 15000, label: 'comment visible' });

        // The editor clears after posting.
        await sleep(300);
        const input = getByTestId('commentInput');
        expect((input.props.value || '').includes(text)).toBe(false);
    }, 90000);
});
