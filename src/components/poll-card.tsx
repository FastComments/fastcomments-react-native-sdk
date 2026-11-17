import { useEffect, useReducer, useRef, useState } from 'react';
import { Animated, I18nManager, Platform, Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { CommentPollOption } from 'fastcomments-sdk';
import type { IFastCommentsStyles, RNComment } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import {
    arePollResultsLocked,
    canSeePollVoters,
    canVoteOnPoll,
    getPollClosesText,
    getPollPercent,
    getPollPrivacyText,
    getPollResponsesText,
    hasVotedOnPoll,
    isPollClosed,
    isPollOptionSelected,
    isShowingPollResults,
    pollTextToPlain,
    showPollOptions,
    togglePollResults,
    votePoll,
} from '../services/polls';
import { SavingShimmer } from './saving-shimmer';
import { PollVotersModal } from './poll-voters-modal';

const BAR_ANIMATION_MS = 300;
// setTimeout overflows past this and fires immediately.
const MAX_TIMER_MS = 2147483647;

export interface PollCardProps {
    comment: RNComment;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

interface PollOptionRowProps {
    commentId: string;
    option: CommentPollOption;
    percent: number;
    selected: boolean;
    showResults: boolean;
    votable: boolean;
    disabled: boolean;
    styles: IFastCommentsStyles;
    onPress: (optionId: string) => void;
}

function PollOptionRow({ commentId, option, percent, selected, showResults, votable, disabled, styles, onPress }: PollOptionRowProps) {
    const s = styles.polls;
    const target = showResults ? percent / 100 : 0;
    const bar = useRef(new Animated.Value(target)).current;
    // Like the web bar's width transition: tallies and the results toggle slide rather than jump.
    // Scaled rather than resized so the native driver runs it: every live tally restarts it for every viewer.
    useEffect(() => {
        const animation = Animated.timing(bar, { toValue: target, duration: BAR_ANIMATION_MS, useNativeDriver: Platform.OS !== 'web' });
        animation.start();
        return () => animation.stop();
    }, [bar, target]);
    const label = pollTextToPlain(option.label);
    return (
        <Pressable
            testID={`pollOption-${commentId}-${option.id}`}
            role="radio"
            aria-checked={selected}
            aria-disabled={!votable}
            aria-label={showResults ? `${label}, ${percent}%` : label}
            disabled={disabled}
            onPress={() => onPress(option.id)}
            style={({ pressed }) => [s?.option, selected && s?.optionSelected, pressed && votable && s?.optionPressed]}
        >
            <Animated.View
                testID={`pollOptionBar-${commentId}-${option.id}`}
                style={[
                    s?.optionBar,
                    showResults && selected && s?.optionBarSelected,
                    // transformOrigin is physical, so grow from the side the option text starts on.
                    { transformOrigin: I18nManager.isRTL ? 'right' : 'left', transform: [{ scaleX: bar }] },
                ]}
            />
            <View style={[s?.optionMark, selected && s?.optionMarkSelected]}>
                {selected && <View style={s?.optionCheck} />}
            </View>
            <Text style={s?.optionLabel}>{label}</Text>
            {/* Hidden rather than removed, so revealing results doesn't shift the label. */}
            <Text testID={`pollOptionPercent-${commentId}-${option.id}`} style={[s?.optionPercent, { opacity: showResults ? 1 : 0 }]}>
                {percent}%
            </Text>
        </Pressable>
    );
}

/**
 * A comment's poll: each option is a chip that doubles as its own result bar once results are showing. Render it only
 * once the `comment-ui-polls` translations are loaded (useTranslationComponent).
 */
export function PollCard({ comment, store, styles, translations }: PollCardProps) {
    const s = styles.polls;
    const locale = useStoreValue(store, (state) => state.config.locale);
    const pollVoting = useStoreValue(store, (state) => state.config.pollVoting);
    const currentUser = useStoreValue(store, (state) => state.currentUser);
    const [votersOpen, setVotersOpen] = useState(false);
    const [renderTick, rerender] = useReducer((count: number) => count + 1, 0);
    const poll = comment.poll;
    const closesAtMs = poll && poll.closesAt ? new Date(poll.closesAt).valueOf() : null;

    // Flip the card to its closed state when an open poll reaches its close time on screen. A close date past the
    // timer ceiling takes several hops: each one re-renders, which re-arms the timer for the time still left.
    useEffect(() => {
        if (closesAtMs === null) {
            return;
        }
        const delay = closesAtMs - Date.now();
        if (delay <= 0) {
            return;
        }
        const timer = setTimeout(rerender, Math.min(delay + 1, MAX_TIMER_MS));
        return () => clearTimeout(timer);
    }, [closesAtMs, renderTick]);

    if (!poll) {
        return null;
    }
    const now = Date.now();
    const commentId = comment._id;
    const closed = isPollClosed(poll, now);
    const voted = hasVotedOnPoll(comment);
    const locked = arePollResultsLocked(comment, now);
    const showResults = isShowingPollResults(comment, now);
    const votable = canVoteOnPoll({ pollVoting }, currentUser, poll, now);
    const total = poll.totalVotes || 0;
    const closesText = getPollClosesText(translations, locale, poll.closesAt, closed);
    const saving = !!comment.pollSaving;
    const question = pollTextToPlain(poll.question);

    return (
        <View testID={`pollCard-${commentId}`} style={s?.card}>
            <Text style={s?.question} role="heading">
                {question}
            </Text>
            <View role="radiogroup" aria-label={question} style={[s?.options, { position: 'relative' }]}>
                {poll.options.map((option) => (
                    <PollOptionRow
                        key={option.id}
                        commentId={commentId}
                        option={option}
                        percent={getPollPercent(option.votes, total)}
                        selected={isPollOptionSelected(comment, option.id)}
                        showResults={showResults}
                        votable={votable}
                        // A logged-out viewer can still tap, so the card can say why the vote didn't count.
                        disabled={closed || saving}
                        styles={styles}
                        onPress={(optionId) => void votePoll(store, commentId, optionId)}
                    />
                ))}
                <SavingShimmer active={saving} color={s?.savingShimmerColor} />
            </View>
            <View style={s?.footer}>
                <Text testID={`pollTotal-${commentId}`} style={[s?.helpText, { fontVariant: ['tabular-nums'] }]}>
                    {getPollResponsesText(translations, locale, total)}
                </Text>
                {/* Always shown: whether a vote carries your name is something to know before voting. */}
                <Text style={s?.helpText}>{getPollPrivacyText(translations, poll)}</Text>
                {closesText !== null && (
                    <Text testID={`pollCloses-${commentId}`} style={s?.helpText}>
                        {closesText}
                    </Text>
                )}
                <View style={s?.footerSpacer} />
                {!!comment.pollError && (
                    <Text testID={`pollError-${commentId}`} style={s?.errorText}>
                        {comment.pollError}
                    </Text>
                )}
                {voted && (
                    <View testID={`pollSaved-${commentId}`} style={s?.savedPill}>
                        <View style={s?.savedCheck} />
                        <Text style={s?.savedText}>{translations.POLL_VOTE_SAVED}</Text>
                    </View>
                )}
                {voted && showResults && !closed && (
                    <TouchableOpacity testID={`pollChangeVote-${commentId}`} hitSlop={8} onPress={() => showPollOptions(store, commentId)}>
                        <Text style={s?.link}>{translations.POLL_CHANGE_VOTE}</Text>
                    </TouchableOpacity>
                )}
                {/* A locked poll can't reveal anything, so it gets no toggle. */}
                {!voted && !closed && !locked && (
                    <TouchableOpacity testID={`pollToggleResults-${commentId}`} hitSlop={8} onPress={() => togglePollResults(store, commentId)}>
                        <Text style={s?.link}>{showResults ? translations.POLL_HIDE_RESULTS : translations.POLL_SHOW_RESULTS}</Text>
                    </TouchableOpacity>
                )}
                {canSeePollVoters(poll) && total > 0 && (
                    <TouchableOpacity testID={`pollVotersLink-${commentId}`} hitSlop={8} onPress={() => setVotersOpen(true)}>
                        <Text style={s?.link}>{translations.POLL_VOTERS_SHOW}</Text>
                    </TouchableOpacity>
                )}
            </View>
            {votersOpen && (
                <PollVotersModal
                    commentId={commentId}
                    store={store}
                    styles={styles}
                    translations={translations}
                    onClose={() => setVotersOpen(false)}
                />
            )}
        </View>
    );
}
