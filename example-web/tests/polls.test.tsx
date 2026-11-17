/** Web-lane poll tests: the card and composer mounted through react-native-web. */
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { FastCommentsLiveCommentingService } from '../../src/services/fastcomments-live-commenting';
import { canCreatePoll, canSeePollVoters, canVoteOnPoll, getPollPrivacyText } from '../../src/services/polls';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import { PollCard } from '../../src/components/poll-card';
import { PollBuilder } from '../../src/components/poll-builder';
import { PollVotersModal } from '../../src/components/poll-voters-modal';
import type { FastCommentsRNConfig } from '../../src/types/react-native-config';
import type { RNComment } from '../../src/types/react-native-comment';

const translations: Record<string, string> = {
    POLL_RESPONSES_SINGULAR: '[count] response',
    POLL_RESPONSES_PLURAL: '[count] responses',
    POLL_VOTES_ANONYMOUS: 'Votes are anonymous',
    POLL_VOTES_ADMINS_VISIBLE: 'Admins can see who voted',
    POLL_VOTES_PUBLIC_VISIBLE: 'Individual responses are public.',
    POLL_VOTE_SAVED: 'Your vote is in',
    POLL_CHANGE_VOTE: 'Change vote',
    POLL_SHOW_RESULTS: 'Show results',
    POLL_HIDE_RESULTS: 'Hide results',
    POLL_VOTERS_SHOW: 'See who voted',
    POLL_QUESTION_PLACEHOLDER: 'Ask a question...',
    POLL_OPTION_PLACEHOLDER: 'Option [n]',
    POLL_ADD_OPTION: 'Add option',
    POLL_REMOVE_OPTION: 'Remove option',
    POLL_CLOSES_NEVER: 'No end date',
    POLL_CLOSES_1_DAY: '1 day',
    POLL_CLOSES_3_DAYS: '3 days',
    POLL_CLOSES_1_WEEK: '1 week',
    POLL_REMOVE: 'Remove poll',
    POLL_PRIVACY_LABEL: 'Privacy',
    POLL_PRIVACY_ANONYMOUS: 'Anonymous',
    POLL_PRIVACY_ADMINS: 'Admins can see who voted',
    POLL_PRIVACY_PUBLIC: 'Public',
    POLL_PRIVACY_HELP: 'For public polls, any user can see who voted what.',
    POLL_REQUIRE_VOTE_TO_SEE_RESULTS: 'Require Vote to See Results',
    POLL_CLOSED: 'Poll closed',
    POLL_CLOSES_AT: 'Closes [date]',
    POLL_VOTERS_TITLE: 'Who voted',
    POLL_VOTERS_CLOSE: 'Close',
    POLL_VOTERS_LOADING: 'Loading...',
    POLL_VOTERS_FAILED: 'Could not load voters',
    POLL_VOTERS_NONE: 'No votes yet',
    POLL_VOTERS_SEARCH_PLACEHOLDER: 'Search names',
    POLL_VOTERS_PREV: 'Previous',
    POLL_VOTERS_NEXT: 'Next',
    POLL_VOTERS_COUNT_SINGULAR: '[count] voter',
    POLL_VOTERS_COUNT_PLURAL: '[count] voters',
};

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

function makeStore(comment: RNComment) {
    const config: FastCommentsRNConfig = { tenantId: 'demo', urlId: 'poll-test', apiHost: 'https://fastcomments.com' };
    const store = FastCommentsLiveCommentingService.createStoreFromConfig(config);
    store.getState().mergeConfig({ pollCreation: 2 });
    store.getState().setTranslations(translations);
    store.getState().replaceAll([comment], false);
    return store;
}

const pollComment: RNComment = {
    _id: 'c1',
    tenantId: 'demo',
    urlId: 'poll-test',
    commentHTML: '<p>Lunch?</p>',
    commenterName: 'Author',
    date: '2026-11-16T00:00:00Z',
    verified: false,
    poll: {
        question: 'Tacos &amp; ramen?',
        options: [
            { id: 'a', label: 'Tacos', votes: 1 },
            { id: 'b', label: 'Ramen', votes: 3 },
        ],
        totalVotes: 4,
        privacy: 2,
    },
};

describe('poll rules under the web bundler', () => {
    it('evaluates the mode and privacy checks', () => {
        expect(canCreatePoll({ pollCreation: 2 }, false)).toBe(true);
        expect(canCreatePoll({ pollCreation: 1 }, true)).toBe(true);
        expect(canCreatePoll({ pollCreation: 1 }, false)).toBe(false);
        expect(canVoteOnPoll({ pollVoting: 1 }, null, pollComment.poll!)).toBe(true);
        expect(canSeePollVoters(pollComment.poll!)).toBe(true);
        expect(getPollPrivacyText(translations, pollComment.poll!)).toBe('Individual responses are public.');
    });
});

describe('PollCard (react-native-web)', () => {
    it('renders the question, options and footer', () => {
        const store = makeStore(pollComment);
        const { getByText, getByTestId } = render(
            <PollCard comment={store.getState().byId.c1} store={store} styles={getDefaultFastCommentsStyles()} translations={translations} />
        );
        expect(getByText('Tacos & ramen?')).toBeTruthy();
        expect(getByText('Ramen')).toBeTruthy();
        expect(getByTestId('pollTotal-c1').textContent).toBe('4 responses');
        expect(getByText('Show results')).toBeTruthy();
        expect(getByText('See who voted')).toBeTruthy();
    });

    it('shows results and the saved pill once voted', () => {
        const store = makeStore({ ...pollComment, myPollVotes: ['b'] });
        const { getByText, getByTestId } = render(
            <PollCard comment={store.getState().byId.c1} store={store} styles={getDefaultFastCommentsStyles()} translations={translations} />
        );
        expect(getByText('Your vote is in')).toBeTruthy();
        expect(getByText('Change vote')).toBeTruthy();
        expect(getByTestId('pollOptionPercent-c1-b').textContent).toBe('75%');
        // The bar spans the option and is scaled to its share, growing from the text's start.
        const bar = getComputedStyle(getByTestId('pollOptionBar-c1-b'));
        expect(bar.transform).toBe('scaleX(0.75)');
        expect(bar.transformOrigin).toBe('left');
        expect(getByTestId('pollOption-c1-b').getAttribute('aria-checked')).toBe('true');
    });

    it('flips to closed on screen even when the close date is beyond the longest single timer', () => {
        vi.useFakeTimers({ now: new Date('2026-11-16T00:00:00Z') });
        const dayMs = 86400000;
        // Past setTimeout's ~24.8 day ceiling, so the card has to re-arm its timer to get there.
        const closesAt = new Date(Date.now() + 40 * dayMs).toISOString();
        const store = makeStore({ ...pollComment, poll: { ...pollComment.poll!, closesAt } });
        const { getByTestId } = render(
            <PollCard comment={store.getState().byId.c1} store={store} styles={getDefaultFastCommentsStyles()} translations={translations} />
        );
        expect(getByTestId('pollCloses-c1').textContent).not.toBe('Poll closed');
        // Separate steps, since act() batches renders: the capped timer has to fire and render before the close date.
        act(() => {
            vi.advanceTimersByTime(30 * dayMs);
        });
        expect(getByTestId('pollCloses-c1').textContent).not.toBe('Poll closed');
        act(() => {
            vi.advanceTimersByTime(10 * dayMs + 1000);
        });
        expect(getByTestId('pollCloses-c1').textContent).toBe('Poll closed');
    });
});

describe('PollVotersModal (react-native-web)', () => {
    it('decodes the server-escaped voter names', async () => {
        const store = makeStore(pollComment);
        store.getState().sdk.publicApi.getPollVoters = vi.fn().mockResolvedValue({
            status: 'success',
            voters: [{ name: 'Tom &amp; Jerry', optionLabel: 'Tacos &amp; salsa' }],
            total: 1,
            hasMore: false,
        });
        const { findByText } = render(
            <PollVotersModal commentId="c1" store={store} styles={getDefaultFastCommentsStyles()} translations={translations} onClose={() => undefined} />
        );
        expect(await findByText('Tacos & salsa')).toBeTruthy();
        await waitFor(() => expect(document.body.textContent).toContain('Tom & Jerry'));
    });
});

describe('PollBuilder (react-native-web)', () => {
    it('renders the composer fields', () => {
        const store = makeStore(pollComment);
        const { getByPlaceholderText, getByText } = render(
            <PollBuilder
                observer={{}}
                focusRequest={0}
                onRemove={() => undefined}
                imageAssets={store.getState().imageAssets}
                hasDarkBackground={false}
                styles={getDefaultFastCommentsStyles()}
                translations={translations}
            />
        );
        expect(getByPlaceholderText('Ask a question...')).toBeTruthy();
        expect(getByPlaceholderText('Option 2')).toBeTruthy();
        expect(getByText('Anonymous ▾')).toBeTruthy();
        expect(getByText('Remove poll')).toBeTruthy();
    });
});
