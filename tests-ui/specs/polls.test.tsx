/**
 * Polls in comments, against the real backend: building one in the composer, voting, live tallies between two
 * viewers, the voter list, the login gate and results locked until voting. Mirrors the web widget's polls extension
 * and the Android PollUITests.
 */
import React from 'react';
import { Animated } from 'react-native';
import { fireEvent, render, RenderAPI } from '@testing-library/react-native';
import * as commentTextArea from '../../src/components/comment-text-area';
import { PollPrivacy } from 'fastcomments-sdk/server';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollFor, pollUntil, sleep } from '../framework/harness/poll';
import { textOf } from '../framework/harness/text-of';
import { pressViaProp } from '../framework/harness/events';
import { createCustomConfig, fetchPoll, seedPollComment, votePollAs } from '../framework/api/polls-rest';
import { fetchLatestCommentId } from '../framework/api/comments-rest';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

function renderWidget(ctx: TestContext, ssoToken?: string): RenderAPI {
    const config = buildSDKConfig({ tenant: ctx.tenant, urlId: ctx.urlId, ssoToken });
    const rendered = render(<FastCommentsLiveCommenting config={config} />);
    ctx.onTeardown(() => rendered.unmount());
    return rendered;
}

async function waitForText(rendered: RenderAPI, testID: string, expected: string, label: string) {
    await pollUntil(() => {
        const node = rendered.queryByTestId(testID);
        return !!node && textOf(node) === expected;
    }, { timeoutMs: 20000, label });
}

function percentOpacity(rendered: RenderAPI, testID: string): number {
    const node = rendered.getByTestId(testID);
    const flat = [node.props.style].flat(Infinity).filter(Boolean);
    const withOpacity = flat.reverse().find((style: { opacity?: number }) => typeof style.opacity === 'number');
    return withOpacity ? withOpacity.opacity : 1;
}

maybe('Polls UI tests', () => {
    let ctx: TestContext;

    afterEach(async () => {
        await teardownTestContext(ctx);
    });

    it('builds a poll in the composer, posts it, and votes on it', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-create', urlIdLabel: 'poll-create' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        // Spied before mounting, so every render of the reply box's editor goes through the spy.
        const textAreaRenders = jest.spyOn(commentTextArea, 'CommentTextArea');
        ctx.onTeardown(() => textAreaRenders.mockRestore());
        const timings = jest.spyOn(Animated, 'timing');
        ctx.onTeardown(() => timings.mockRestore());
        const ui = renderWidget(ctx, ctx.ssoFor('userA'));

        await pollUntil(() => !!ui.queryByTestId('toolbarPollButton'), { timeoutMs: 20000, label: 'poll button' });
        fireEvent.press(ui.getByTestId('toolbarPollButton'));
        await pollUntil(() => !!ui.queryByTestId('pollBuilder'), { label: 'poll builder' });

        // Editing the poll must not redraw the editor and its toolbar on every keystroke.
        textAreaRenders.mockClear();
        fireEvent.changeText(ui.getByTestId('pollBuilderQuestion'), 'Lunch plan?');
        fireEvent.changeText(ui.getByTestId('pollBuilderOptionInput-0'), 'Tacos');
        fireEvent.changeText(ui.getByTestId('pollBuilderOptionInput-1'), 'Ramen');
        fireEvent.press(ui.getByTestId('pollBuilderAddOption'));
        fireEvent.changeText(ui.getByTestId('pollBuilderOptionInput-2'), 'Pho');
        fireEvent.press(ui.getByTestId('pollBuilderCloses-3'));
        expect(textAreaRenders).not.toHaveBeenCalled();
        fireEvent.changeText(ui.getByTestId('commentInput'), 'Lunch vote');
        fireEvent.press(ui.getByTestId('sendButton'));

        const commentId = await pollFor(() => {
            const card = ui.queryAllByTestId(/^pollCard-/)[0];
            return card ? String(card.props.testID).replace('pollCard-', '') : undefined;
        }, { timeoutMs: 20000, label: 'posted poll card' });
        expect(ui.queryByTestId('pollBuilder')).toBeNull();
        expect(ui.getByText('Lunch plan?')).toBeTruthy();
        await waitForText(ui, `pollTotal-${commentId}`, '0 responses', 'zero total');
        expect(textOf(ui.getByTestId(`pollCloses-${commentId}`))).toMatch(/^Poll closes /);

        const stored = await fetchPoll(ctx.tenant, commentId);
        expect(stored.question).toBe('Lunch plan?');
        expect(stored.options.map((option) => option.label)).toEqual(['Tacos', 'Ramen', 'Pho']);
        expect(stored.closesAt).toBeTruthy();
        const ramen = stored.options[1];

        fireEvent.press(ui.getByTestId(`pollOption-${commentId}-${ramen.id}`));
        await pollUntil(() => !!ui.queryByTestId(`pollSaved-${commentId}`), { timeoutMs: 20000, label: 'vote saved' });
        await waitForText(ui, `pollTotal-${commentId}`, '1 response', 'one response');
        expect(textOf(ui.getByTestId(`pollOptionPercent-${commentId}-${ramen.id}`))).toBe('100%');
        expect(percentOpacity(ui, `pollOptionPercent-${commentId}-${ramen.id}`)).toBe(1);
        // Tallies move on every live update, so the bars must animate off the JS thread. RN's jest mock
        // finishes native animations without reporting the end value, so check where they were sent.
        const barTimings = timings.mock.calls.filter(([, config]) => config.duration === 300);
        expect(barTimings.map(([, config]) => config.toValue)).toContain(1);
        expect(barTimings.every(([, config]) => config.useNativeDriver)).toBe(true);

        const afterVote = await fetchPoll(ctx.tenant, commentId);
        expect(afterVote.totalVotes).toBe(1);
        expect(afterVote.options[1].votes).toBe(1);

        // Change vote returns to the options, and picking another option moves the vote.
        fireEvent.press(ui.getByTestId(`pollChangeVote-${commentId}`));
        expect(percentOpacity(ui, `pollOptionPercent-${commentId}-${ramen.id}`)).toBe(0);
        const tacos = stored.options[0];
        fireEvent.press(ui.getByTestId(`pollOption-${commentId}-${tacos.id}`));
        await waitForText(ui, `pollOptionPercent-${commentId}-${tacos.id}`, '100%', 'vote moved to tacos');
        const moved = await fetchPoll(ctx.tenant, commentId);
        expect(moved.totalVotes).toBe(1);
        expect(moved.options[0].votes).toBe(1);
        expect(moved.options[1].votes).toBe(0);
    });

    it('blocks a half-written poll and keeps the comment unsent', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-validate', urlIdLabel: 'poll-validate' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        const ui = renderWidget(ctx, ctx.ssoFor('userA'));

        await pollUntil(() => !!ui.queryByTestId('toolbarPollButton'), { timeoutMs: 20000, label: 'poll button' });
        fireEvent.press(ui.getByTestId('toolbarPollButton'));
        fireEvent.changeText(ui.getByTestId('commentInput'), 'Half a poll');
        fireEvent.press(ui.getByTestId('sendButton'));
        await waitForText(ui, 'pollBuilderError', 'Enter a question for your poll.', 'question required');

        fireEvent.changeText(ui.getByTestId('pollBuilderQuestion'), 'Best day?');
        fireEvent.changeText(ui.getByTestId('pollBuilderOptionInput-0'), 'Friday');
        expect(ui.queryByTestId('pollBuilderError')).toBeNull();
        fireEvent.press(ui.getByTestId('sendButton'));
        await waitForText(ui, 'pollBuilderError', 'Enter at least two options.', 'two options required');

        await sleep(1500);
        expect(await fetchLatestCommentId(ctx.tenant, ctx.urlId)).toBeNull();

        fireEvent.press(ui.getByTestId('pollBuilderRemove'));
        expect(ui.queryByTestId('pollBuilder')).toBeNull();
    });

    it('moves tallies live to another viewer and lets them reveal results', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-live', urlIdLabel: 'poll-live' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        const commentId = await seedPollComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Live poll',
            ssoToken: ctx.ssoFor('author'),
            poll: { question: 'Tea or coffee?', options: ['Tea', 'Coffee'] },
        });
        const { options } = await fetchPoll(ctx.tenant, commentId);
        const coffee = options[1];

        const viewerA = renderWidget(ctx, ctx.ssoFor('userA'));
        const viewerB = renderWidget(ctx, ctx.ssoFor('userB'));
        await waitForText(viewerA, `pollTotal-${commentId}`, '0 responses', 'A sees the poll');
        await waitForText(viewerB, `pollTotal-${commentId}`, '0 responses', 'B sees the poll');
        // Let both websockets subscribe before the vote is broadcast.
        await sleep(2000);

        fireEvent.press(viewerB.getByTestId(`pollOption-${commentId}-${coffee.id}`));
        await pollUntil(() => !!viewerB.queryByTestId(`pollSaved-${commentId}`), { timeoutMs: 20000, label: 'B voted' });

        await waitForText(viewerA, `pollTotal-${commentId}`, '1 response', 'A got the live tally');
        expect(viewerA.queryByTestId(`pollSaved-${commentId}`)).toBeNull();
        // A has not voted, so the new count arrives with results still hidden until asked for.
        expect(percentOpacity(viewerA, `pollOptionPercent-${commentId}-${coffee.id}`)).toBe(0);
        // fireEvent.press drops presses on a tree a live event just re-rendered (see events.ts).
        pressViaProp(viewerA.getByTestId(`pollToggleResults-${commentId}`));
        expect(textOf(viewerA.getByTestId(`pollOptionPercent-${commentId}-${coffee.id}`))).toBe('100%');
        expect(percentOpacity(viewerA, `pollOptionPercent-${commentId}-${coffee.id}`)).toBe(1);
        expect(textOf(viewerA.getByTestId(`pollToggleResults-${commentId}`))).toBe('Hide results');
    });

    it('lists who voted on a public poll', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-voters', urlIdLabel: 'poll-voters' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        const commentId = await seedPollComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Public poll',
            ssoToken: ctx.ssoFor('author'),
            poll: { question: 'Cats or dogs?', options: ['Cats', 'Dogs'], privacy: PollPrivacy.NUMBER_2 },
        });
        const { options } = await fetchPoll(ctx.tenant, commentId);
        await votePollAs(ctx.tenant, ctx.urlId, commentId, options[1].id, ctx.ssoFor('userB'));

        const ui = renderWidget(ctx, ctx.ssoFor('userA'));
        await waitForText(ui, `pollTotal-${commentId}`, '1 response', 'poll with one vote');
        expect(ui.getByText('Individual responses are public.')).toBeTruthy();

        fireEvent.press(ui.getByTestId(`pollVotersLink-${commentId}`));
        await pollUntil(() => !!ui.queryByTestId('pollVoterRow-0'), { timeoutMs: 20000, label: 'voter row' });
        expect(textOf(ui.getByTestId('pollVoterRow-0'))).toBe('Tester userBDogs');
        expect(textOf(ui.getByTestId('pollVotersCount'))).toBe('1 voter');
        fireEvent.press(ui.getByTestId('pollVotersClose'));
        expect(ui.queryByTestId('pollVotersDialog')).toBeNull();
    });

    it('tells a logged-out viewer to log in instead of voting', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-anon', urlIdLabel: 'poll-anon' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        const commentId = await seedPollComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Members poll',
            ssoToken: ctx.ssoFor('author'),
            poll: { question: 'Morning or night?', options: ['Morning', 'Night'] },
        });
        const { options } = await fetchPoll(ctx.tenant, commentId);

        const ui = renderWidget(ctx);
        await waitForText(ui, `pollTotal-${commentId}`, '0 responses', 'anonymous viewer sees the poll');
        expect(ui.queryByTestId('toolbarPollButton')).toBeTruthy();
        fireEvent.press(ui.getByTestId(`pollOption-${commentId}-${options[0].id}`));
        await waitForText(ui, `pollError-${commentId}`, 'Log in to vote', 'login prompt');
        expect((await fetchPoll(ctx.tenant, commentId)).totalVotes).toBe(0);
    });

    it('keeps results hidden until the viewer votes when the author requires it', async () => {
        ctx = await setupTestContext({ emailPrefix: 'poll-locked', urlIdLabel: 'poll-locked' });
        await createCustomConfig(ctx.tenant, { pollCreation: 2 });
        const commentId = await seedPollComment({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            text: 'Locked poll',
            ssoToken: ctx.ssoFor('author'),
            poll: { question: 'Beach or mountains?', options: ['Beach', 'Mountains'], requireVoteToSeeResults: true },
        });
        const { options } = await fetchPoll(ctx.tenant, commentId);
        await votePollAs(ctx.tenant, ctx.urlId, commentId, options[0].id, ctx.ssoFor('userB'));

        const ui = renderWidget(ctx, ctx.ssoFor('userA'));
        await pollUntil(() => !!ui.queryByTestId(`pollCard-${commentId}`), { timeoutMs: 20000, label: 'locked poll card' });
        expect(ui.queryByTestId(`pollToggleResults-${commentId}`)).toBeNull();
        expect(percentOpacity(ui, `pollOptionPercent-${commentId}-${options[0].id}`)).toBe(0);

        fireEvent.press(ui.getByTestId(`pollOption-${commentId}-${options[1].id}`));
        await pollUntil(() => !!ui.queryByTestId(`pollSaved-${commentId}`), { timeoutMs: 20000, label: 'voted on locked poll' });
        await waitForText(ui, `pollTotal-${commentId}`, '2 responses', 'real tally after voting');
        expect(textOf(ui.getByTestId(`pollOptionPercent-${commentId}-${options[0].id}`))).toBe('50%');
        expect(percentOpacity(ui, `pollOptionPercent-${commentId}-${options[0].id}`)).toBe(1);
    });
});
