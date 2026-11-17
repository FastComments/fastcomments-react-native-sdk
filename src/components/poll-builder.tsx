import { useEffect, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PollPrivacy } from 'fastcomments-sdk/server';
import { FastCommentsImageAsset, type IFastCommentsStyles, type ImageAssetConfig } from '../types';
import {
    addPollDraftOption,
    newPollDraft,
    POLL_CLOSE_DAY_CHOICES,
    POLL_MAX_OPTION_LENGTH,
    POLL_MAX_OPTIONS,
    POLL_MAX_QUESTION_LENGTH,
    POLL_MIN_OPTIONS,
    type PollDraft,
    removePollDraftOption,
} from '../services/polls';
import { ModalMenu } from './modal-menu';

export interface PollToolbarIconProps {
    styles: IFastCommentsStyles;
}

/** The web toolbar's poll glyph: three bars of different lengths. */
export function PollToolbarIcon({ styles }: PollToolbarIconProps) {
    const s = styles.polls;
    return (
        <View style={s?.toolbarIcon}>
            <View style={[s?.toolbarIconBar, { width: '62%' }]} />
            <View style={[s?.toolbarIconBar, { width: '100%' }]} />
            <View style={[s?.toolbarIconBar, { width: '42%' }]} />
        </View>
    );
}

/**
 * Filled in by PollBuilder on every render, like the editor's ValueObserver. The draft lives in the builder,
 * so typing in it re-renders only the builder and not the reply box around it.
 */
export interface PollBuilderObserver {
    getDraft?: () => PollDraft;
    showError?: (error: string, focusOptionId?: string) => void;
}

export interface PollBuilderProps {
    observer: PollBuilderObserver;
    /** Bumped when the toolbar's poll button is tapped again, to return focus to the question. **/
    focusRequest: number;
    onRemove: () => void;
    imageAssets: ImageAssetConfig;
    hasDarkBackground: boolean;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

// Single-line fields: a pasted newline would otherwise end up in the poll text.
function toSingleLine(value: string): string {
    return value.replace(/[\r\n]+/g, ' ');
}

/** The poll composer inside the comment input, under the text. Mirrors the web widget's editing card. */
export function PollBuilder({ observer, focusRequest, onRemove, imageAssets, hasDarkBackground, styles, translations }: PollBuilderProps) {
    const s = styles.polls;
    const [draft, setDraft] = useState<PollDraft>(newPollDraft);
    observer.getDraft = () => draft;
    observer.showError = (error, focusOptionId) => setDraft((current) => ({ ...current, error, focusOptionId }));
    const onChange = (next: PollDraft) => setDraft({ ...next, error: undefined, focusOptionId: undefined });
    const questionRef = useRef<TextInput>(null);
    const optionRefs = useRef<Record<string, TextInput | null>>({});
    const [focusedOptionId, setFocusedOptionId] = useState<string | null>(null);
    const [questionFocused, setQuestionFocused] = useState(false);
    const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
    const [showPrivacyHelp, setShowPrivacyHelp] = useState(false);

    useEffect(() => {
        questionRef.current?.focus();
    }, [focusRequest]);

    // Focus a field once it exists: a newly added option, or the field a validation error points at.
    useEffect(() => {
        if (pendingFocusId && optionRefs.current[pendingFocusId]) {
            optionRefs.current[pendingFocusId]?.focus();
            setPendingFocusId(null);
        }
    }, [pendingFocusId, draft.options]);

    useEffect(() => {
        if (draft.focusOptionId) {
            setPendingFocusId(draft.focusOptionId);
        } else if (draft.error) {
            questionRef.current?.focus();
        }
    }, [draft.error, draft.focusOptionId]);

    const update = (patch: Partial<PollDraft>) => onChange({ ...draft, ...patch });

    const addOption = () => {
        const next = addPollDraftOption(draft);
        if (next !== draft) {
            onChange(next);
            setPendingFocusId(next.options[next.options.length - 1].id);
        }
    };

    const removeOption = (optionId: string) => {
        const index = draft.options.findIndex((option) => option.id === optionId);
        const next = removePollDraftOption(draft, optionId);
        if (next !== draft) {
            onChange(next);
            const neighbour = next.options[Math.min(index, next.options.length - 1)];
            setPendingFocusId(neighbour.id);
        }
    };

    const closeLabels: Record<(typeof POLL_CLOSE_DAY_CHOICES)[number], string> = {
        0: translations.POLL_CLOSES_NEVER,
        1: translations.POLL_CLOSES_1_DAY,
        3: translations.POLL_CLOSES_3_DAYS,
        7: translations.POLL_CLOSES_1_WEEK,
    };
    const privacyChoices: Array<[PollPrivacy, string]> = [
        [PollPrivacy.NUMBER_0, translations.POLL_PRIVACY_ANONYMOUS],
        [PollPrivacy.NUMBER_1, translations.POLL_PRIVACY_ADMINS],
        [PollPrivacy.NUMBER_2, translations.POLL_PRIVACY_PUBLIC],
    ];
    const privacyLabel = (privacyChoices.find(([value]) => value === draft.privacy) || privacyChoices[0])[1];
    const canRemoveOptions = draft.options.length > POLL_MIN_OPTIONS;

    return (
        <View testID="pollBuilder" style={s?.builder}>
            <TextInput
                ref={questionRef}
                testID="pollBuilderQuestion"
                style={[s?.builderQuestionInput, questionFocused && s?.builderQuestionInputFocused]}
                onFocus={() => setQuestionFocused(true)}
                onBlur={() => setQuestionFocused(false)}
                placeholder={translations.POLL_QUESTION_PLACEHOLDER}
                placeholderTextColor={s?.builderPlaceholderColor}
                aria-label={translations.POLL_QUESTION_PLACEHOLDER}
                value={draft.question}
                maxLength={POLL_MAX_QUESTION_LENGTH}
                onChangeText={(question) => update({ question: toSingleLine(question) })}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => optionRefs.current[draft.options[0].id]?.focus()}
            />
            <View style={s?.options}>
                {draft.options.map((option, index) => {
                    const placeholder = translations.POLL_OPTION_PLACEHOLDER.replace('[n]', String(index + 1));
                    const isLast = index === draft.options.length - 1;
                    return (
                        <View
                            key={option.id}
                            testID={`pollBuilderOption-${index}`}
                            style={[s?.builderOption, focusedOptionId === option.id && s?.builderOptionFocused]}
                        >
                            <View style={s?.optionMark} />
                            <TextInput
                                ref={(input) => {
                                    optionRefs.current[option.id] = input;
                                }}
                                testID={`pollBuilderOptionInput-${index}`}
                                style={s?.builderOptionInput}
                                placeholder={placeholder}
                                placeholderTextColor={s?.builderPlaceholderColor}
                                aria-label={placeholder}
                                value={option.text}
                                maxLength={POLL_MAX_OPTION_LENGTH}
                                onFocus={() => setFocusedOptionId(option.id)}
                                onBlur={() => setFocusedOptionId((current) => (current === option.id ? null : current))}
                                onChangeText={(text) =>
                                    update({
                                        options: draft.options.map((candidate) =>
                                            candidate.id === option.id ? { ...candidate, text: toSingleLine(text) } : candidate
                                        ),
                                    })
                                }
                                returnKeyType="next"
                                blurOnSubmit={false}
                                // Like the web composer: next option, or a new one from the last.
                                onSubmitEditing={() =>
                                    isLast ? addOption() : optionRefs.current[draft.options[index + 1].id]?.focus()
                                }
                            />
                            {/* Kept in place when hidden, so rows don't change width at the two-option minimum. */}
                            <TouchableOpacity
                                testID={`pollBuilderRemoveOption-${index}`}
                                aria-label={translations.POLL_REMOVE_OPTION}
                                disabled={!canRemoveOptions}
                                hitSlop={10}
                                style={[s?.builderRemoveOption, { opacity: canRemoveOptions ? 1 : 0 }]}
                                onPress={() => removeOption(option.id)}
                            >
                                <Text style={s?.builderRemoveOptionText}>×</Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}
                {draft.options.length < POLL_MAX_OPTIONS && (
                    <TouchableOpacity testID="pollBuilderAddOption" role="button" style={s?.builderAddOption} onPress={addOption}>
                        <View style={s?.builderAddOptionMark}>
                            <Text style={s?.builderAddOptionMarkText}>+</Text>
                        </View>
                        <Text style={s?.builderAddOptionText}>{translations.POLL_ADD_OPTION}</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={s?.footer}>
                {POLL_CLOSE_DAY_CHOICES.map((days) => {
                    const active = draft.closesDays === days;
                    return (
                        <TouchableOpacity
                            key={days}
                            testID={`pollBuilderCloses-${days}`}
                            role="button"
                            aria-selected={active}
                            style={[s?.builderPill, active && s?.builderPillActive]}
                            onPress={() => update({ closesDays: days })}
                        >
                            <Text style={[s?.builderPillText, active && s?.builderPillTextActive]}>{closeLabels[days]}</Text>
                        </TouchableOpacity>
                    );
                })}
                <TouchableOpacity
                    testID="pollBuilderRequireVote"
                    role="checkbox"
                    aria-checked={draft.requireVoteToSeeResults}
                    style={s?.builderCheckbox}
                    onPress={() => update({ requireVoteToSeeResults: !draft.requireVoteToSeeResults })}
                >
                    <View style={[s?.builderCheckboxBox, draft.requireVoteToSeeResults && s?.builderCheckboxBoxChecked]}>
                        {draft.requireVoteToSeeResults && <View style={s?.optionCheck} />}
                    </View>
                    <Text style={s?.builderCheckboxText}>{translations.POLL_REQUIRE_VOTE_TO_SEE_RESULTS}</Text>
                </TouchableOpacity>
                <View style={s?.builderPrivacy}>
                    <ModalMenu
                        closeIcon={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                        styles={styles}
                        items={privacyChoices.map(([value, label]) => ({
                            id: `pollPrivacy-${value}`,
                            label,
                            handler: () => update({ privacy: value }),
                        }))}
                        openButton={
                            <View testID="pollBuilderPrivacy" aria-label={translations.POLL_PRIVACY_LABEL} style={s?.builderPrivacyButton}>
                                <Text style={s?.builderPrivacyButtonText}>{privacyLabel} ▾</Text>
                            </View>
                        }
                    />
                    {/* No hover on touch screens, so the note toggles inline instead of living in a title tooltip. */}
                    <TouchableOpacity
                        testID="pollBuilderPrivacyHelp"
                        role="button"
                        aria-label={translations.POLL_PRIVACY_HELP}
                        hitSlop={14}
                        style={s?.builderHelpIcon}
                        onPress={() => setShowPrivacyHelp(!showPrivacyHelp)}
                    >
                        <Text style={s?.builderHelpIconText}>?</Text>
                    </TouchableOpacity>
                </View>
                <View style={s?.footerSpacer} />
                {!!draft.error && (
                    <Text testID="pollBuilderError" style={s?.errorText}>
                        {draft.error}
                    </Text>
                )}
                <TouchableOpacity testID="pollBuilderRemove" hitSlop={8} onPress={onRemove}>
                    <Text style={s?.builderRemove}>{translations.POLL_REMOVE}</Text>
                </TouchableOpacity>
            </View>
            {showPrivacyHelp && (
                <Text testID="pollBuilderPrivacyHelpText" style={[s?.helpText, { marginTop: 8 }]}>
                    {translations.POLL_PRIVACY_HELP}
                </Text>
            )}
        </View>
    );
}
