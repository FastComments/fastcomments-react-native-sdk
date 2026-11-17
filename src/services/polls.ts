import { PollCreationMode, PollPrivacy, PollVotingMode } from 'fastcomments-sdk/server';
import type { CommentPollInput, GetPollVoterNamesSuccessResponse } from 'fastcomments-sdk';
import type { FastCommentsStore } from '../store/types';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import type { RNComment, RNCommentPoll } from '../types/react-native-comment';
import type { FastCommentsSessionUser } from '../types/user';
import type { WebsocketLivePollUpdateEvent } from '../types/dto/websocket-live-event';
import { pickPlural } from './pick-plural';
import { newBroadcastId } from './broadcast-id';
import { getActionTenantId, getActionURLID } from './tenants';

// Poll rules shared by the poll card, the composer and the live-event handler. Mirrors the web widget's polls extension.

export const POLL_MAX_OPTIONS = 10;
export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_QUESTION_LENGTH = 200;
export const POLL_MAX_OPTION_LENGTH = 100;
/** Long enough that typing a whole name is one request, since the voter search scans the joined names server side. */
export const POLL_VOTER_SEARCH_DEBOUNCE_MS = 3000;
export const POLL_CLOSE_DAY_CHOICES = [0, 1, 3, 7] as const;

const DAY_MS = 86400000;

type Translations = Record<string, string>;

export function arePollsEnabled(config: Pick<FastCommentsRNConfig, 'pollCreation'>): boolean {
    // Like the web widget, polls render only while creation is configured, so disabling it hides existing polls.
    return !!config.pollCreation;
}

export function isPollClosed(poll: RNCommentPoll, now: number = Date.now()): boolean {
    return !!poll.closesAt && new Date(poll.closesAt).valueOf() <= now;
}

export function getPollPercent(votes: number, total: number): number {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
}

export function hasVotedOnPoll(comment: Pick<RNComment, 'myPollVotes'>): boolean {
    return !!comment.myPollVotes && comment.myPollVotes.length > 0;
}

export function isPollOptionSelected(comment: Pick<RNComment, 'myPollVotes'>, optionId: string): boolean {
    return !!comment.myPollVotes && comment.myPollVotes.indexOf(optionId) !== -1;
}

/**
 * The author can withhold tallies until you answer. The page load zeroes the counts, but live poll-update events carry
 * the real ones to everyone, so this is what keeps them off screen. That is by design: the lock is a reveal-after-voting
 * UX, not a secret.
 */
export function arePollResultsLocked(comment: RNComment, now: number = Date.now()): boolean {
    const poll = comment.poll;
    return !!poll && !!poll.requireVoteToSeeResults && !hasVotedOnPoll(comment) && !isPollClosed(poll, now);
}

export function isShowingPollResults(comment: RNComment, now: number = Date.now()): boolean {
    const poll = comment.poll;
    if (!poll || arePollResultsLocked(comment, now)) {
        return false;
    }
    if (comment.pollShowResults !== undefined) {
        return comment.pollShowResults;
    }
    return hasVotedOnPoll(comment) || isPollClosed(poll, now);
}

/** An anonymous session still has a user object, so holding one is not the same as being logged in. */
export function canVoteOnPoll(
    config: Pick<FastCommentsRNConfig, 'pollVoting'>,
    currentUser: FastCommentsSessionUser,
    poll: RNCommentPoll,
    now: number = Date.now()
): boolean {
    if (isPollClosed(poll, now)) {
        return false;
    }
    if (config.pollVoting === PollVotingMode.NUMBER_1) {
        return true;
    }
    return !!currentUser && !('isAnonSession' in currentUser && currentUser.isAnonSession);
}

/** Anonymous polls never offer the list. An admins-only poll offers it to everyone and the server turns away non-admins. */
export function canSeePollVoters(poll: RNCommentPoll): boolean {
    return poll.privacy === PollPrivacy.NUMBER_1 || poll.privacy === PollPrivacy.NUMBER_2;
}

export function canCreatePoll(
    config: Pick<FastCommentsRNConfig, 'pollCreation' | 'useSingleLineCommentInput'>,
    isSiteAdmin: boolean
): boolean {
    if (config.useSingleLineCommentInput) {
        return false;
    }
    if (config.pollCreation === PollCreationMode.NUMBER_2) {
        return true;
    }
    return config.pollCreation === PollCreationMode.NUMBER_1 && isSiteAdmin;
}

const localeTags: Record<string, string> = {};

/**
 * Our locale ids use underscores (sr_latn_rs), Intl wants BCP-47 (sr-Latn-RS). Without this, dates and counts follow
 * the device locale instead of the widget's. Intl throws on a malformed tag, hence the fallback.
 */
export function getPollLocaleTag(locale: string | undefined | null): string {
    if (!locale) {
        return 'en';
    }
    if (!localeTags[locale]) {
        let tag = 'en';
        try {
            tag = Intl.getCanonicalLocales(locale.replace(/_/g, '-'))[0] || 'en';
        } catch {
            tag = 'en';
        }
        localeTags[locale] = tag;
    }
    return localeTags[locale];
}

const POLL_TEXT_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };

/** Poll text is stored escaped by the server (the same five characters as commenter names). One pass, so "&amp;lt;" stays "&lt;". */
export function pollTextToPlain(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    return html.replace(/&(amp|lt|gt|quot|#39);/g, (_match, entity: string) => POLL_TEXT_ENTITIES[entity]);
}

export function getPollResponsesText(translations: Translations, locale: string | undefined | null, total: number): string {
    const template = pickPlural(
        total,
        locale,
        translations.POLL_RESPONSES_SINGULAR,
        translations.POLL_RESPONSES_PLURAL,
        translations.POLL_RESPONSES_PLURAL_T,
        translations.POLL_RESPONSES_PLURAL_F,
        translations.POLL_RESPONSES_PLURAL_M
    );
    return template.replace('[count]', total.toLocaleString(getPollLocaleTag(locale)));
}

export function getPollVotersCountText(translations: Translations, locale: string | undefined | null, count: number): string {
    const template = pickPlural(
        count,
        locale,
        translations.POLL_VOTERS_COUNT_SINGULAR,
        translations.POLL_VOTERS_COUNT_PLURAL,
        translations.POLL_VOTERS_COUNT_PLURAL_T,
        translations.POLL_VOTERS_COUNT_PLURAL_F,
        translations.POLL_VOTERS_COUNT_PLURAL_M
    );
    return template.replace('[count]', count.toLocaleString(getPollLocaleTag(locale)));
}

/** Stated from the voter's side rather than the author's: what happens to your vote if you tap. */
export function getPollPrivacyText(translations: Translations, poll: RNCommentPoll): string {
    if (poll.privacy === PollPrivacy.NUMBER_2) {
        return translations.POLL_VOTES_PUBLIC_VISIBLE;
    }
    if (poll.privacy === PollPrivacy.NUMBER_1) {
        return translations.POLL_VOTES_ADMINS_VISIBLE;
    }
    return translations.POLL_VOTES_ANONYMOUS;
}

export function getPollClosesText(
    translations: Translations,
    locale: string | undefined | null,
    closesAt: Date | string | null | undefined,
    closed: boolean
): string | null {
    if (!closesAt) {
        return null;
    }
    if (closed) {
        return translations.POLL_CLOSED;
    }
    return translations.POLL_CLOSES_AT.replace('[date]', new Date(closesAt).toLocaleDateString(getPollLocaleTag(locale)));
}

// ---- Composer drafts ----

export interface PollDraftOption {
    id: string;
    text: string;
}

export interface PollDraft {
    question: string;
    options: PollDraftOption[];
    /** 0 means the poll never closes. */
    closesDays: number;
    privacy: PollPrivacy;
    requireVoteToSeeResults: boolean;
    error?: string;
    /** The option the composer should focus after a validation error. */
    focusOptionId?: string;
}

let nextDraftOptionId = 1;

function newDraftOption(): PollDraftOption {
    return { id: String(nextDraftOptionId++), text: '' };
}

export function newPollDraft(): PollDraft {
    return {
        question: '',
        options: [newDraftOption(), newDraftOption()],
        closesDays: 0,
        privacy: PollPrivacy.NUMBER_0,
        requireVoteToSeeResults: false,
    };
}

export function addPollDraftOption(draft: PollDraft): PollDraft {
    if (draft.options.length >= POLL_MAX_OPTIONS) {
        return draft;
    }
    return { ...draft, options: [...draft.options, newDraftOption()] };
}

export function removePollDraftOption(draft: PollDraft, optionId: string): PollDraft {
    if (draft.options.length <= POLL_MIN_OPTIONS) {
        return draft;
    }
    return { ...draft, options: draft.options.filter((option) => option.id !== optionId) };
}

export type PollInputResult = { input: CommentPollInput } | { error: string; focusOptionId?: string };

/** Validates a draft the way the web composer does, so a half-written poll is never posted or silently dropped. */
export function buildPollInput(draft: PollDraft, translations: Translations, now: number = Date.now()): PollInputResult {
    const question = draft.question.trim();
    if (!question) {
        return { error: translations.POLL_ERROR_QUESTION_REQUIRED };
    }
    const filled = draft.options.filter((option) => option.text.trim());
    if (filled.length < POLL_MIN_OPTIONS) {
        const empty = draft.options.find((option) => !option.text.trim());
        return { error: translations.POLL_ERROR_MIN_OPTIONS, focusOptionId: empty ? empty.id : undefined };
    }
    return {
        input: {
            question,
            options: filled.map((option) => option.text.trim()),
            closesAt: draft.closesDays > 0 ? new Date(now + draft.closesDays * DAY_MS).toISOString() : undefined,
            // Anonymous is the default, so it is left off the wire entirely.
            privacy: draft.privacy === PollPrivacy.NUMBER_0 ? undefined : draft.privacy,
            requireVoteToSeeResults: draft.requireVoteToSeeResults ? true : undefined,
        },
    };
}

// ---- Store actions ----

/**
 * Applies a live tally. Every update is a full snapshot of the counts, so the echo of our own vote is applied too:
 * that keeps the newest snapshot on screen when another voter's update lands around ours.
 */
export function applyPollUpdate(store: FastCommentsStore, event: WebsocketLivePollUpdateEvent) {
    const state = store.getState();
    const comment = state.byId[event.commentId];
    if (!comment || !comment.poll || !event.poll) {
        return;
    }
    state.mergeCommentFields(event.commentId, {
        poll: {
            ...comment.poll,
            options: event.poll.options,
            totalVotes: event.poll.totalVotes,
            closesAt: event.poll.closesAt,
        },
        pollUpdateCount: (comment.pollUpdateCount || 0) + 1,
    });
}

export function togglePollResults(store: FastCommentsStore, commentId: string, now: number = Date.now()) {
    const state = store.getState();
    const comment = state.byId[commentId];
    if (!comment || !comment.poll) {
        return;
    }
    state.mergeCommentFields(commentId, { pollShowResults: !isShowingPollResults(comment, now) });
}

/** "Change vote": back to the votable options while keeping the current selection marked. */
export function showPollOptions(store: FastCommentsStore, commentId: string) {
    store.getState().mergeCommentFields(commentId, { pollShowResults: false });
}

interface PollErrorBody {
    code?: string;
    translatedError?: string;
}

// The generated client throws a ResponseError (not exported) carrying the fetch Response for any non-2xx answer.
async function readErrorBody(error: unknown): Promise<PollErrorBody | null> {
    if (typeof error !== 'object' || error === null || !('response' in error)) {
        return null;
    }
    const response = error.response;
    if (typeof response !== 'object' || response === null || !('json' in response) || typeof response.json !== 'function') {
        return null;
    }
    try {
        const body: unknown = await response.json();
        if (typeof body !== 'object' || body === null) {
            return null;
        }
        return {
            code: 'code' in body && typeof body.code === 'string' ? body.code : undefined,
            translatedError: 'translatedError' in body && typeof body.translatedError === 'string' ? body.translatedError : undefined,
        };
    } catch {
        return null;
    }
}

async function getVoteErrorText(error: unknown, translations: Translations): Promise<string> {
    const body = await readErrorBody(error);
    if (body && body.translatedError) {
        return body.translatedError;
    }
    if (body && body.code === 'poll-login-required') {
        return translations.POLL_LOGIN_TO_VOTE;
    }
    if (body && body.code === 'poll-closed') {
        return translations.POLL_CLOSED;
    }
    return translations.POLL_VOTE_FAILED;
}

export async function votePoll(store: FastCommentsStore, commentId: string, optionId: string, now: number = Date.now()): Promise<void> {
    const state = store.getState();
    const comment = state.byId[commentId];
    if (!comment || !comment.poll || comment.pollSaving || isPollClosed(comment.poll, now)) {
        return;
    }
    if (!canVoteOnPoll(state.config, state.currentUser, comment.poll, now)) {
        state.mergeCommentFields(commentId, { pollError: state.translations.POLL_LOGIN_TO_VOTE });
        return;
    }
    if (isPollOptionSelected(comment, optionId)) {
        state.mergeCommentFields(commentId, { pollShowResults: true, pollError: undefined });
        return;
    }
    state.mergeCommentFields(commentId, { pollSaving: true, pollError: undefined });
    const updateCountAtStart = comment.pollUpdateCount || 0;
    try {
        const response = await state.sdk.publicApi.votePoll({
            tenantId: getActionTenantId({ store, tenantId: comment.tenantId }),
            commentId,
            votePollBody: { optionId },
            urlId: getActionURLID({ store, urlId: comment.urlId }),
            broadcastId: newBroadcastId(store),
            sso: state.ssoConfigString,
        });
        const latest = store.getState().byId[commentId];
        if (!latest) {
            return;
        }
        const patch: Partial<RNComment> = {
            pollSaving: false,
            pollShowResults: true,
            pollError: undefined,
            myPollVotes: response.myPollVotes,
        };
        // A live tally that landed while this request was in flight is at least as new as the response's.
        if ((latest.pollUpdateCount || 0) === updateCountAtStart) {
            patch.poll = response.poll;
        }
        store.getState().mergeCommentFields(commentId, patch);
    } catch (error) {
        const pollError = await getVoteErrorText(error, store.getState().translations);
        store.getState().mergeCommentFields(commentId, { pollSaving: false, pollError });
    }
}

export async function fetchPollVoters(
    store: FastCommentsStore,
    commentId: string,
    page: number,
    search: string
): Promise<GetPollVoterNamesSuccessResponse> {
    const state = store.getState();
    const comment = state.byId[commentId];
    return state.sdk.publicApi.getPollVoters({
        tenantId: getActionTenantId({ store, tenantId: comment ? comment.tenantId : undefined }),
        commentId,
        urlId: getActionURLID({ store, urlId: comment ? comment.urlId : undefined }),
        page,
        search: search || undefined,
        sso: state.ssoConfigString,
    });
}
