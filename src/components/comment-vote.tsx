import { View, Text, Image, TextInput, ActivityIndicator, Button, Linking } from 'react-native';
import type {
    FastCommentsCallbacks,
    RNComment,
    IFastCommentsStyles,
    ImageAssetConfig,
} from '../types';
import { FastCommentsImageAsset } from '../types';
import { VoteStyle } from 'fastcomments-typescript';
import { useState } from 'react';
import { VoteBodyParamsVoteDirEnum } from 'fastcomments-sdk/server';
import type { VoteBodyParams, VoteComment200Response } from 'fastcomments-sdk';
import { getActionTenantId } from '../services/tenants';
import { newBroadcastId } from '../services/broadcast-id';
import { userNeedsAuthToAct } from '../services/user-auth-state';
import { Pressable } from 'react-native';
import { FastCommentsRNConfig } from '../types/react-native-config';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface CommentVoteProps extends Pick<FastCommentsCallbacks, 'onVoteSuccess'> {
    store: FastCommentsStore;
    comment: RNComment;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

interface VoteState {
    voteDir?: 'up' | 'down';
    isLoading?: boolean;
    isAuthenticating?: boolean;
    isAwaitingVerification?: boolean;
    authEmail?: string;
    authUserName?: string;
    voteResponse?: VoteComment200Response;
    requestFailed?: boolean;
}

const ErrorCodesToMessageIds: Record<string, string> = {
    'username-taken': 'USERNAME_TAKEN_DIFF_EMAIL',
    'already-voted': 'ALREADY_VOTED',
};

async function doVote(
    store: FastCommentsStore,
    comment: RNComment,
    voteState: VoteState,
    setVoteState: (patch: Partial<VoteState>) => void,
    onVoteSuccess?: FastCommentsCallbacks['onVoteSuccess']
) {
    const state = store.getState();
    const currentUser = state.currentUser;
    if (userNeedsAuthToAct(currentUser, !!state.config.allowAnon)) {
        if (voteState.authUserName && (state.config.allowAnon || voteState.authEmail)) {
            // has authentication info
        } else {
            const sso = state.config.sso;
            if (sso && !state.config.allowAnon) {
                if (sso.loginURL) {
                    return await Linking.openURL(sso.loginURL);
                }
                if (sso.loginCallback) {
                    return sso.loginCallback('');
                }
            } else {
                setVoteState({ isAuthenticating: true });
                return;
            }
        }
    }
    setVoteState({ isLoading: true, requestFailed: false });
    try {
        const tenantIdToUse = getActionTenantId({ store, tenantId: comment.tenantId });
        const sdk = state.sdk;

        if (comment.isVotedUp || comment.isVotedDown) {
            const response = await sdk.publicApi.deleteCommentVote({
                tenantId: tenantIdToUse,
                commentId: comment._id,
                voteId: comment.myVoteId!,
                urlId: state.config.urlId!,
                broadcastId: newBroadcastId(store),
                editKey: comment.editKey,
                sso: state.ssoConfigString,
            });
            if (response.status === 'success') {
                onVoteSuccess && onVoteSuccess(comment, comment.myVoteId!, 'deleted', response.status);
                const patch: Partial<RNComment> = {};
                if (comment.isVotedUp) {
                    patch.isVotedUp = false;
                    if (!response.wasPendingVote) {
                        patch.votes = (comment.votes || 0) - 1;
                        patch.votesUp = (comment.votesUp || 0) - 1;
                    }
                } else {
                    patch.isVotedDown = false;
                    if (!response.wasPendingVote) {
                        patch.votes = (comment.votes || 0) + 1;
                        patch.votesDown = (comment.votesDown || 0) - 1;
                    }
                }
                store.getState().mergeCommentFields(comment._id, patch);
            }
        } else {
            const sessionId =
                currentUser && 'sessionId' in currentUser
                    ? (currentUser as { sessionId?: string }).sessionId
                    : undefined;
            const voteBodyParams: VoteBodyParams = {
                voteDir: voteState.voteDir === 'up' ? VoteBodyParamsVoteDirEnum.up : VoteBodyParamsVoteDirEnum.down,
                url: state.config.url ?? null,
                commenterName: currentUser
                    ? (currentUser as { username?: string }).username ?? null
                    : voteState.authUserName ?? null,
                commenterEmail:
                    currentUser && 'email' in currentUser
                        ? (currentUser as { email?: string }).email ?? null
                        : voteState.authEmail ?? null,
            };
            const response = await sdk.publicApi.voteComment({
                tenantId: tenantIdToUse,
                commentId: comment._id,
                urlId: state.config.urlId!,
                broadcastId: newBroadcastId(store),
                voteBodyParams,
                sessionId,
                sso: state.ssoConfigString,
            });
            setVoteState({ voteResponse: response });
            if (response.status === 'success') {
                const patch: Partial<RNComment> = { myVoteId: response.voteId };
                if (voteState.voteDir === 'up') {
                    patch.isVotedUp = true;
                    patch.votes = (comment.votes || 0) + 1;
                    patch.votesUp = (comment.votesUp || 0) + 1;
                } else {
                    patch.isVotedDown = true;
                    patch.votes = (comment.votes || 0) - 1;
                    patch.votesDown = (comment.votesDown || 0) + 1;
                }
                patch.voteEditKey = response.editKey;
                store.getState().mergeCommentFields(comment._id, patch);
                onVoteSuccess && onVoteSuccess(comment, response.voteId!, voteState.voteDir!, response.status);
                setVoteState({ isAwaitingVerification: false });
            } else if ((response.status as string) === 'pending-verification') {
                const patch: Partial<RNComment> = { myVoteId: response.voteId, voteEditKey: response.editKey };
                if (voteState.voteDir === 'up') patch.isVotedUp = true;
                else patch.isVotedDown = true;
                store.getState().mergeCommentFields(comment._id, patch);
                onVoteSuccess && onVoteSuccess(comment, response.voteId!, voteState.voteDir!, 'pending-verification');
                setVoteState({ isAwaitingVerification: !response.isVerified });
            }
        }
    } catch (e) {
        console.error('Failed to vote', e);
        // A rejected session vote (e.g. stale anon cookie -> 401) must not dead
        // end: fall back to collecting identity, or surface a visible error.
        if (!voteState.authUserName && !state.config.sso) {
            setVoteState({ isLoading: false, isAuthenticating: true });
            return;
        }
        setVoteState({ isLoading: false, requestFailed: true });
        return;
    }
    setVoteState({ isLoading: false });
}

export function CommentVote(props: CommentVoteProps) {
    const { comment, config, styles, translations, imageAssets, store, onVoteSuccess } = props;
    const [voteState, setVoteStateRaw] = useState<VoteState>({});
    const setVoteState = (patch: Partial<VoteState>) =>
        setVoteStateRaw((prev) => ({ ...prev, ...patch }));
    // subscribe to comment changes so vote counts update
    useStoreValue(store, (s) => s.byId[comment._id]);

    if (config.disableVoting) return null;

    const showDownVoting = !config.disableDownVoting;

    const upCount = Number(comment.votesUp || 0);
    const downCount = Number(comment.votesDown || 0);

    // Heart style: one like toggle (the icon is overridable via assets, e.g.
    // a star), no up/down pair. Pressing again removes the vote.
    const isHeartStyle = config.voteStyle === VoteStyle.Heart;

    const voteOptions = isHeartStyle ? (
        <View style={styles.commentVote?.commentVoteOptions}>
            <Pressable
                testID={`likeButton-${comment._id}`}
                accessibilityLabel="likeButton"
                style={styles.commentVote?.voteButton}
                onPress={() => {
                    setVoteStateRaw((prev) => ({ ...prev, voteDir: 'up' }));
                    void doVote(store, comment, { ...voteState, voteDir: 'up' }, setVoteState, onVoteSuccess);
                }}
            >
                <Image
                    source={
                        imageAssets[
                            comment.isVotedUp
                                ? FastCommentsImageAsset.ICON_HEART_ACTIVE
                                : FastCommentsImageAsset.ICON_HEART
                        ]
                    }
                    style={styles.commentVote?.voteButtonIcon}
                />
            </Pressable>
            <Text
                testID={`likeCount-${comment._id}`}
                accessibilityLabel="likeCount"
                style={[styles.commentVote?.votesDownText, upCount === 0 && styles.commentVote?.votesZeroText]}
            >
                {upCount.toLocaleString()}
            </Text>
        </View>
    ) : (
        <View style={styles.commentVote?.commentVoteOptions}>
            <Text
                testID={`upVoteCount-${comment._id}`}
                accessibilityLabel="upVoteCount"
                style={[styles.commentVote?.votesUpText, upCount === 0 && styles.commentVote?.votesZeroText]}
            >
                {upCount.toLocaleString()}
            </Text>
            <Pressable
                testID={`upVoteButton-${comment._id}`}
                accessibilityLabel="upVoteButton"
                style={styles.commentVote?.voteButton}
                onPress={() => {
                    setVoteStateRaw((prev) => ({ ...prev, voteDir: 'up' }));
                    void doVote(store, comment, { ...voteState, voteDir: 'up' }, setVoteState, onVoteSuccess);
                }}
            >
                <Image
                    source={
                        imageAssets[
                            comment.isVotedUp
                                ? config.hasDarkBackground
                                    ? FastCommentsImageAsset.ICON_UP_ACTIVE_WHITE
                                    : FastCommentsImageAsset.ICON_UP_ACTIVE
                                : FastCommentsImageAsset.ICON_UP
                        ]
                    }
                    style={styles.commentVote?.voteButtonIcon}
                />
            </Pressable>
            {showDownVoting && <View style={styles.commentVote?.voteDivider} />}
            {showDownVoting && (
                <Pressable
                    testID={`downVoteButton-${comment._id}`}
                    accessibilityLabel="downVoteButton"
                    style={styles.commentVote?.voteButton}
                    onPress={() => {
                        setVoteStateRaw((prev) => ({ ...prev, voteDir: 'down' }));
                        void doVote(store, comment, { ...voteState, voteDir: 'down' }, setVoteState, onVoteSuccess);
                    }}
                >
                    <Image
                        source={
                            imageAssets[
                                comment.isVotedDown
                                    ? config.hasDarkBackground
                                        ? FastCommentsImageAsset.ICON_DOWN_ACTIVE_WHITE
                                        : FastCommentsImageAsset.ICON_DOWN_ACTIVE
                                    : FastCommentsImageAsset.ICON_DOWN
                            ]
                        }
                        style={styles.commentVote?.voteButtonIcon}
                    />
                </Pressable>
            )}
            {showDownVoting && (
                <Text
                    testID={`downVoteCount-${comment._id}`}
                    accessibilityLabel="downVoteCount"
                    style={[styles.commentVote?.votesDownText, downCount === 0 && styles.commentVote?.votesZeroText]}
                >
                    {downCount.toLocaleString()}
                </Text>
            )}
        </View>
    );

    let auth = null;
    if (voteState.isAuthenticating) {
        auth = (
            <View style={styles.commentVote?.commentVoteAuth} testID="voteAuthForm" accessibilityLabel="voteAuthForm">
                {!config.disableEmailInputs && (
                    <View>
                        <Text style={styles.commentVote?.voteAuthReasoning}>{translations.ENTER_EMAIL_VOTE}</Text>
                        <TextInput
                            testID="voteAuthEmailInput"
                            accessibilityLabel="voteAuthEmailInput"
                            style={styles.commentVote?.authInput}
                            textContentType="emailAddress"
                            value={voteState.authEmail}
                            placeholder={translations.ENTER_EMAIL_VERIFICATION}
                            onChangeText={(newValue) => setVoteState({ authEmail: newValue })}
                        />
                    </View>
                )}
                <TextInput
                    testID="voteAuthUsernameInput"
                    accessibilityLabel="voteAuthUsernameInput"
                    style={styles.commentVote?.authInput}
                    textContentType="username"
                    value={voteState.authUserName}
                    placeholder={translations.PUBLICLY_DISPLAYED_USERNAME}
                    onChangeText={(newValue) => setVoteState({ authUserName: newValue })}
                />
                <View style={styles.commentVote?.voteAuthButtons}>
                    <Button title={translations.CANCEL} onPress={() => setVoteState({ isAuthenticating: false })} />
                    <Button
                        title={translations.SAVE_N_VOTE}
                        onPress={() => void doVote(store, comment, voteState, setVoteState, onVoteSuccess)}
                    />
                </View>
            </View>
        );
    }

    let pendingVoteMessage = null;
    if (voteState.isAwaitingVerification) {
        pendingVoteMessage = (
            <Text style={styles.commentVote?.voteAwaitingVerificationMessage}>
                {translations.VOTE_APPLIES_AFTER_VERIFICATION}
            </Text>
        );
    }

    let error = null;
    const lastVoteResponse = voteState.voteResponse;
    if (lastVoteResponse && lastVoteResponse.status === 'failed') {
        if (lastVoteResponse.code === 'banned') {
            let bannedText = translations.BANNED_VOTING;
            if (lastVoteResponse.bannedUntil) {
                bannedText +=
                    ' ' +
                    translations.BAN_ENDS.replace(
                        '[endsText]',
                        new Date(lastVoteResponse.bannedUntil).toLocaleString()
                    );
            }
            error = <Text style={styles.commentVote?.voteError}>{bannedText}</Text>;
        } else if (lastVoteResponse.code && lastVoteResponse.code in ErrorCodesToMessageIds) {
            error = (
                <Text style={styles.commentVote?.voteError}>
                    {translations[ErrorCodesToMessageIds[lastVoteResponse.code]]}
                </Text>
            );
        } else {
            error = <Text style={styles.commentVote?.voteError}>{translations.ERROR_MESSAGE}</Text>;
        }
    } else if (voteState.requestFailed) {
        error = (
            <Text style={styles.commentVote?.voteError} testID="voteError" accessibilityLabel="voteError">
                {translations.ERROR_MESSAGE}
            </Text>
        );
    }

    return (
        <View style={styles.commentVote?.root}>
            {voteOptions}
            {pendingVoteMessage}
            {auth}
            {error}
            {voteState.isLoading && (
                <View style={styles.commentVote?.loadingView}>
                    <ActivityIndicator size="small" />
                </View>
            )}
        </View>
    );
}
