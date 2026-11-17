import { APIStatus, PollCreationMode, PollPrivacy, PollVotingMode } from 'fastcomments-sdk/server';
import type { VotePollResponse } from 'fastcomments-sdk';
import { makeComment, makeTestStore } from '../../store/__tests__/test-helpers';
import type { FastCommentsStore } from '../../store/types';
import type { RNComment, RNCommentPoll } from '../../types/react-native-comment';
import { handleLiveEvent } from '../live';
import {
    addPollDraftOption,
    applyPollUpdate,
    arePollResultsLocked,
    buildPollInput,
    canCreatePoll,
    canSeePollVoters,
    canVoteOnPoll,
    getPollClosesText,
    getPollPercent,
    getPollPrivacyText,
    getPollResponsesText,
    hasVotedOnPoll,
    isPollClosed,
    isShowingPollResults,
    newPollDraft,
    pollTextToPlain,
    removePollDraftOption,
    togglePollResults,
    votePoll,
} from '../polls';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const DAY = 86400000;

const translations: Record<string, string> = {
    POLL_RESPONSES_SINGULAR: '[count] response',
    POLL_RESPONSES_PLURAL: '[count] responses',
    POLL_CLOSES_AT: 'Poll closes [date]',
    POLL_CLOSED: 'Poll closed',
    POLL_LOGIN_TO_VOTE: 'Log in to vote',
    POLL_VOTE_FAILED: 'We could not save your vote. Please try again.',
    POLL_VOTES_ANONYMOUS: 'Votes are anonymous',
    POLL_VOTES_ADMINS_VISIBLE: 'Admins can see who voted',
    POLL_VOTES_PUBLIC_VISIBLE: 'Individual responses are public.',
    POLL_ERROR_QUESTION_REQUIRED: 'Enter a question for your poll.',
    POLL_ERROR_MIN_OPTIONS: 'Enter at least two options.',
};

function makePoll(overrides: Partial<RNCommentPoll> = {}): RNCommentPoll {
    return {
        question: 'Lunch?',
        options: [
            { id: 'a', label: 'Tacos', votes: 1 },
            { id: 'b', label: 'Ramen', votes: 3 },
        ],
        totalVotes: 4,
        ...overrides,
    };
}

function makePollComment(overrides: Partial<RNComment> = {}): RNComment {
    return makeComment({ _id: 'c1', poll: makePoll(), ...overrides });
}

function seedStore(comment: RNComment): FastCommentsStore {
    const store = makeTestStore();
    store.getState().replaceAll([comment], false);
    store.getState().setTranslations(translations);
    store.getState().setCurrentUser({
        id: 'u1',
        username: 'Voter',
        authorized: true,
        avatarSrc: null,
        hasBlockedUsers: false,
    });
    return store;
}

function voteResponse(poll: RNCommentPoll, myPollVotes: string[]): VotePollResponse {
    return {
        status: APIStatus.success,
        poll: { ...poll, closesAt: undefined },
        myPollVotes,
        voterId: 'u1',
    };
}

function httpError(body: object): Error {
    return Object.assign(new Error('Response returned an error code'), {
        response: new Response(JSON.stringify(body), { status: 400 }),
    });
}

describe('poll rules', () => {
    it('treats a poll as closed once its close date has passed', () => {
        expect(isPollClosed(makePoll(), NOW)).toBe(false);
        expect(isPollClosed(makePoll({ closesAt: new Date(NOW - 1).toISOString() }), NOW)).toBe(true);
        expect(isPollClosed(makePoll({ closesAt: new Date(NOW + DAY) }), NOW)).toBe(false);
    });

    it('rounds percentages and never divides by zero', () => {
        expect(getPollPercent(1, 3)).toBe(33);
        expect(getPollPercent(2, 3)).toBe(67);
        expect(getPollPercent(0, 0)).toBe(0);
    });

    it('locks results until the viewer votes when the author requires it', () => {
        const locked = makePollComment({ poll: makePoll({ requireVoteToSeeResults: true }) });
        expect(arePollResultsLocked(locked, NOW)).toBe(true);
        expect(arePollResultsLocked({ ...locked, myPollVotes: ['a'] }, NOW)).toBe(false);
        const closed = { ...locked, poll: makePoll({ requireVoteToSeeResults: true, closesAt: new Date(NOW - 1) }) };
        expect(arePollResultsLocked(closed, NOW)).toBe(false);
        // A locked poll never shows results, even if the viewer asked to see them.
        expect(isShowingPollResults({ ...locked, pollShowResults: true }, NOW)).toBe(false);
    });

    it('shows results by default once voted or closed, and honors the viewer toggle', () => {
        const open = makePollComment();
        expect(isShowingPollResults(open, NOW)).toBe(false);
        expect(hasVotedOnPoll({ ...open, myPollVotes: [] })).toBe(false);
        expect(isShowingPollResults({ ...open, myPollVotes: ['a'] }, NOW)).toBe(true);
        expect(isShowingPollResults({ ...open, poll: makePoll({ closesAt: new Date(NOW - 1) }) }, NOW)).toBe(true);
        expect(isShowingPollResults({ ...open, pollShowResults: true }, NOW)).toBe(true);
        expect(isShowingPollResults({ ...open, myPollVotes: ['a'], pollShowResults: false }, NOW)).toBe(false);
    });

    it('lets anyone vote only in Anyone mode, and never on a closed poll', () => {
        const poll = makePoll();
        const anon = { id: 'x', username: '', isAnonSession: true, authorized: true as const, avatarSrc: null, hasBlockedUsers: false };
        const user = { id: 'u', username: 'U', authorized: true, avatarSrc: null, hasBlockedUsers: false };
        expect(canVoteOnPoll({}, anon, poll, NOW)).toBe(false);
        expect(canVoteOnPoll({}, null, poll, NOW)).toBe(false);
        expect(canVoteOnPoll({}, user, poll, NOW)).toBe(true);
        expect(canVoteOnPoll({ pollVoting: PollVotingMode.NUMBER_1 }, null, poll, NOW)).toBe(true);
        expect(canVoteOnPoll({ pollVoting: PollVotingMode.NUMBER_1 }, user, makePoll({ closesAt: new Date(NOW - 1) }), NOW)).toBe(false);
    });

    it('allows poll creation per the pollCreation mode, never in single-line inputs', () => {
        expect(canCreatePoll({ pollCreation: PollCreationMode.NUMBER_2 }, false)).toBe(true);
        expect(canCreatePoll({ pollCreation: PollCreationMode.NUMBER_1 }, false)).toBe(false);
        expect(canCreatePoll({ pollCreation: PollCreationMode.NUMBER_1 }, true)).toBe(true);
        expect(canCreatePoll({ pollCreation: PollCreationMode.NUMBER_0 }, true)).toBe(false);
        expect(canCreatePoll({}, true)).toBe(false);
        expect(canCreatePoll({ pollCreation: PollCreationMode.NUMBER_2, useSingleLineCommentInput: true }, true)).toBe(false);
    });

    it('offers the voter list only for named polls', () => {
        expect(canSeePollVoters(makePoll())).toBe(false);
        expect(canSeePollVoters(makePoll({ privacy: PollPrivacy.NUMBER_0 }))).toBe(false);
        expect(canSeePollVoters(makePoll({ privacy: PollPrivacy.NUMBER_1 }))).toBe(true);
        expect(canSeePollVoters(makePoll({ privacy: PollPrivacy.NUMBER_2 }))).toBe(true);
    });

    it('decodes the server-escaped poll text in one pass', () => {
        expect(pollTextToPlain('Tom &amp; Jerry &lt;3 &quot;it&#39;s&quot;')).toBe('Tom & Jerry <3 "it\'s"');
        expect(pollTextToPlain('&amp;lt;b&amp;gt;')).toBe('&lt;b&gt;');
        expect(pollTextToPlain(undefined)).toBe('');
    });

    it('formats counts, privacy and close dates in the widget locale', () => {
        expect(getPollResponsesText(translations, 'en_us', 1)).toBe('1 response');
        expect(getPollResponsesText(translations, 'en_us', 1234)).toBe('1,234 responses');
        expect(getPollResponsesText(translations, 'de_de', 1234)).toBe('1.234 responses');
        expect(getPollPrivacyText(translations, makePoll())).toBe('Votes are anonymous');
        expect(getPollPrivacyText(translations, makePoll({ privacy: PollPrivacy.NUMBER_1 }))).toBe('Admins can see who voted');
        expect(getPollPrivacyText(translations, makePoll({ privacy: PollPrivacy.NUMBER_2 }))).toBe('Individual responses are public.');
        expect(getPollClosesText(translations, 'en_us', null, false)).toBeNull();
        expect(getPollClosesText(translations, 'en_us', '2026-11-20T12:00:00Z', true)).toBe('Poll closed');
        expect(getPollClosesText(translations, 'en_us', '2026-11-20T12:00:00Z', false)).toBe('Poll closes 11/20/2026');
        expect(getPollClosesText(translations, 'de_de', '2026-11-20T12:00:00Z', false)).toBe('Poll closes 20.11.2026');
    });
});

describe('poll drafts', () => {
    it('starts with two empty options and keeps between two and ten', () => {
        let draft = newPollDraft();
        expect(draft.options).toHaveLength(2);
        expect(removePollDraftOption(draft, draft.options[0].id).options).toHaveLength(2);
        for (let i = 0; i < 12; i++) {
            draft = addPollDraftOption(draft);
        }
        expect(draft.options).toHaveLength(10);
        expect(new Set(draft.options.map((option) => option.id)).size).toBe(10);
        const removed = removePollDraftOption(draft, draft.options[3].id);
        expect(removed.options).toHaveLength(9);
        expect(removed.options.map((option) => option.id)).not.toContain(draft.options[3].id);
    });

    it('requires a question and two filled options', () => {
        const draft = newPollDraft();
        const noQuestion = buildPollInput(draft, translations, NOW);
        expect(noQuestion).toEqual({ error: translations.POLL_ERROR_QUESTION_REQUIRED });

        const oneOption = { ...draft, question: 'Lunch?', options: [{ ...draft.options[0], text: 'Tacos' }, { ...draft.options[1], text: '  ' }] };
        expect(buildPollInput(oneOption, translations, NOW)).toEqual({
            error: translations.POLL_ERROR_MIN_OPTIONS,
            focusOptionId: draft.options[1].id,
        });
    });

    it('trims, drops empty options and leaves defaults off the wire', () => {
        let draft = addPollDraftOption(newPollDraft());
        draft = {
            ...draft,
            question: '  Lunch?  ',
            options: [
                { ...draft.options[0], text: ' Tacos ' },
                { ...draft.options[1], text: '' },
                { ...draft.options[2], text: 'Ramen' },
            ],
        };
        expect(buildPollInput(draft, translations, NOW)).toEqual({
            input: { question: 'Lunch?', options: ['Tacos', 'Ramen'], closesAt: undefined, privacy: undefined, requireVoteToSeeResults: undefined },
        });

        const configured = { ...draft, closesDays: 3, privacy: PollPrivacy.NUMBER_2, requireVoteToSeeResults: true };
        expect(buildPollInput(configured, translations, NOW)).toEqual({
            input: {
                question: 'Lunch?',
                options: ['Tacos', 'Ramen'],
                closesAt: new Date(NOW + 3 * DAY).toISOString(),
                privacy: PollPrivacy.NUMBER_2,
                requireVoteToSeeResults: true,
            },
        });
    });
});

describe('poll live updates', () => {
    it('patches tallies and close date but keeps the question and settings', () => {
        const store = seedStore(makePollComment({ poll: makePoll({ privacy: PollPrivacy.NUMBER_2, requireVoteToSeeResults: true }) }));
        applyPollUpdate(store, {
            type: 'poll-update',
            commentId: 'c1',
            poll: { options: [{ id: 'a', label: 'Tacos', votes: 5 }, { id: 'b', label: 'Ramen', votes: 3 }], totalVotes: 8, closesAt: null },
        });
        const comment = store.getState().byId['c1'];
        expect(comment.poll?.totalVotes).toBe(8);
        expect(comment.poll?.options[0].votes).toBe(5);
        expect(comment.poll?.question).toBe('Lunch?');
        expect(comment.poll?.privacy).toBe(PollPrivacy.NUMBER_2);
        expect(comment.poll?.requireVoteToSeeResults).toBe(true);
        expect(comment.pollUpdateCount).toBe(1);
    });

    it('ignores updates for comments without a poll', () => {
        const store = seedStore(makeComment({ _id: 'c1' }));
        applyPollUpdate(store, { type: 'poll-update', commentId: 'c1', poll: { options: [], totalVotes: 0 } });
        applyPollUpdate(store, { type: 'poll-update', commentId: 'missing', poll: { options: [], totalVotes: 0 } });
        expect(store.getState().byId['c1'].poll).toBeUndefined();
    });

    it('applies the echo of our own vote, since each update is a full snapshot', () => {
        const store = seedStore(makePollComment());
        store.getState().rememberBroadcastId('mine');
        handleLiveEvent(store, {
            type: 'poll-update',
            broadcastId: 'mine',
            commentId: 'c1',
            poll: { options: [{ id: 'a', label: 'Tacos', votes: 2 }, { id: 'b', label: 'Ramen', votes: 3 }], totalVotes: 5 },
        });
        expect(store.getState().byId['c1'].poll?.totalVotes).toBe(5);
    });
});

describe('votePoll', () => {
    it('records the vote, shows results and tags the request with a broadcast id', async () => {
        const store = seedStore(makePollComment());
        const updated = makePoll({ options: [{ id: 'a', label: 'Tacos', votes: 2 }, { id: 'b', label: 'Ramen', votes: 3 }], totalVotes: 5 });
        const spy = jest.spyOn(store.getState().sdk.publicApi, 'votePoll').mockResolvedValue(voteResponse(updated, ['a']));

        const pending = votePoll(store, 'c1', 'a', NOW);
        expect(store.getState().byId['c1'].pollSaving).toBe(true);
        await pending;

        expect(spy).toHaveBeenCalledTimes(1);
        const request = spy.mock.calls[0][0];
        expect(request).toMatchObject({ tenantId: 't1', commentId: 'c1', urlId: 'url-1', votePollBody: { optionId: 'a' } });
        expect(store.getState().broadcastIdsSent.has(request.broadcastId!)).toBe(true);
        const comment = store.getState().byId['c1'];
        expect(comment.myPollVotes).toEqual(['a']);
        expect(comment.poll?.totalVotes).toBe(5);
        expect(comment.pollSaving).toBe(false);
        expect(comment.pollShowResults).toBe(true);
        expect(comment.pollError).toBeUndefined();
    });

    it('keeps a newer live tally that landed while the vote was in flight', async () => {
        const store = seedStore(makePollComment());
        const stale = makePoll({ totalVotes: 5, options: [{ id: 'a', label: 'Tacos', votes: 2 }, { id: 'b', label: 'Ramen', votes: 3 }] });
        jest.spyOn(store.getState().sdk.publicApi, 'votePoll').mockImplementation(async () => {
            applyPollUpdate(store, {
                type: 'poll-update',
                commentId: 'c1',
                poll: { options: [{ id: 'a', label: 'Tacos', votes: 2 }, { id: 'b', label: 'Ramen', votes: 4 }], totalVotes: 6 },
            });
            return voteResponse(stale, ['a']);
        });
        await votePoll(store, 'c1', 'a', NOW);
        const comment = store.getState().byId['c1'];
        expect(comment.poll?.totalVotes).toBe(6);
        expect(comment.myPollVotes).toEqual(['a']);
    });

    it('re-selecting the current option just shows results without a request', async () => {
        const store = seedStore(makePollComment({ myPollVotes: ['a'], pollShowResults: false }));
        const spy = jest.spyOn(store.getState().sdk.publicApi, 'votePoll');
        await votePoll(store, 'c1', 'a', NOW);
        expect(spy).not.toHaveBeenCalled();
        expect(store.getState().byId['c1'].pollShowResults).toBe(true);
    });

    it('tells a logged-out viewer to log in without sending the vote', async () => {
        const store = seedStore(makePollComment());
        store.getState().setCurrentUser(null);
        const spy = jest.spyOn(store.getState().sdk.publicApi, 'votePoll');
        await votePoll(store, 'c1', 'a', NOW);
        expect(spy).not.toHaveBeenCalled();
        expect(store.getState().byId['c1'].pollError).toBe('Log in to vote');
    });

    it('does nothing on a closed poll', async () => {
        const store = seedStore(makePollComment({ poll: makePoll({ closesAt: new Date(NOW - 1).toISOString() }) }));
        const spy = jest.spyOn(store.getState().sdk.publicApi, 'votePoll');
        await votePoll(store, 'c1', 'a', NOW);
        expect(spy).not.toHaveBeenCalled();
        expect(store.getState().byId['c1'].pollSaving).toBeFalsy();
    });

    it.each([
        [{ status: 'failed', code: 'poll-closed' }, 'Poll closed'],
        [{ status: 'failed', code: 'poll-login-required' }, 'Log in to vote'],
        [{ status: 'failed', code: 'internal', translatedError: 'Translated server error' }, 'Translated server error'],
        [{ status: 'failed', code: 'something-else' }, 'We could not save your vote. Please try again.'],
    ])('maps the server error %j to the card error', async (body, expected) => {
        const store = seedStore(makePollComment());
        jest.spyOn(store.getState().sdk.publicApi, 'votePoll').mockRejectedValue(httpError(body));
        await votePoll(store, 'c1', 'a', NOW);
        const comment = store.getState().byId['c1'];
        expect(comment.pollError).toBe(expected);
        expect(comment.pollSaving).toBe(false);
        expect(comment.myPollVotes).toBeUndefined();
    });

    it('shows the generic error when the request never reaches the server', async () => {
        const store = seedStore(makePollComment());
        jest.spyOn(store.getState().sdk.publicApi, 'votePoll').mockRejectedValue(new TypeError('Network request failed'));
        await votePoll(store, 'c1', 'a', NOW);
        expect(store.getState().byId['c1'].pollError).toBe('We could not save your vote. Please try again.');
    });

    it('toggles results from whatever the card currently shows', () => {
        const store = seedStore(makePollComment());
        togglePollResults(store, 'c1', NOW);
        expect(store.getState().byId['c1'].pollShowResults).toBe(true);
        togglePollResults(store, 'c1', NOW);
        expect(store.getState().byId['c1'].pollShowResults).toBe(false);

        const voted = seedStore(makePollComment({ myPollVotes: ['a'] }));
        togglePollResults(voted, 'c1', NOW);
        expect(voted.getState().byId['c1'].pollShowResults).toBe(false);
    });
});
