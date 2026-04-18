import { View, Text, Image, TextInput, ActivityIndicator, Button, Linking } from 'react-native';
import type {
    CommentVoteResponse,
    CommentVoteDeleteResponse,
    FastCommentsCallbacks,
    RNComment,
    IFastCommentsStyles,
    ImageAssetConfig,
} from '../types';
import { FastCommentsImageAsset } from '../types';
import { useState } from 'react';
import { getActionTenantId } from '../services/tenants';
import { createURLQueryString, makeRequest } from '../services/http';
import { newBroadcastId } from '../services/broadcast-id';
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
    voteResponse?: CommentVoteResponse;
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
    if (!currentUser) {
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
    setVoteState({ isLoading: true });
    try {
        const tenantIdToUse = getActionTenantId({ store, tenantId: comment.tenantId });

        if (comment.isVotedUp || comment.isVotedDown) {
            const response = await makeRequest<CommentVoteDeleteResponse>({
                apiHost: state.apiHost,
                method: 'DELETE',
                url: `/comments/${tenantIdToUse}/${comment._id}/vote/${comment.myVoteId}${createURLQueryString({
                    voteId: comment.myVoteId,
                    editKey: comment.editKey,
                    commentId: comment._id,
                    sso: state.ssoConfigString,
                    broadcastId: newBroadcastId(),
                    urlId: state.config.urlId,
                })}`,
            });
            setVoteState({ voteResponse: response });
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
            const response = await makeRequest<CommentVoteResponse>({
                apiHost: state.apiHost,
                method: 'POST',
                url: `/comments/${tenantIdToUse}/${comment._id}/vote${createURLQueryString({
                    urlId: state.config.urlId,
                    sso: state.ssoConfigString,
                    broadcastId: newBroadcastId(),
                    sessionId:
                        currentUser && 'sessionId' in currentUser ? (currentUser as any).sessionId : undefined,
                })}`,
                body: {
                    voteDir: voteState.voteDir,
                    commentId: comment._id,
                    urlId: state.config.urlId,
                    url: state.config.url,
                    commenterName: currentUser ? (currentUser as any).username : voteState.authUserName,
                    commenterEmail:
                        currentUser && 'email' in currentUser ? (currentUser as any).email : voteState.authEmail,
                },
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
            } else if (response.status === 'pending-verification') {
                const patch: Partial<RNComment> = { myVoteId: response.voteId, voteEditKey: response.editKey };
                if (voteState.voteDir === 'up') patch.isVotedUp = true;
                else patch.isVotedDown = true;
                store.getState().mergeCommentFields(comment._id, patch);
                onVoteSuccess && onVoteSuccess(comment, response.voteId!, voteState.voteDir!, response.status);
                setVoteState({ isAwaitingVerification: !response.isVerified });
            }
        }
    } catch (e) {
        console.error('Failed to vote', e);
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

    const voteOptions = (
        <View style={styles.commentVote?.commentVoteOptions}>
            {comment.votesUp ? (
                <Text style={styles.commentVote?.votesUpText}>{Number(comment.votesUp).toLocaleString()}</Text>
            ) : null}
            <Pressable
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
            {showDownVoting && comment.votesDown ? (
                <Text style={styles.commentVote?.votesDownText}>
                    {Number(comment.votesDown).toLocaleString()}
                </Text>
            ) : null}
        </View>
    );

    let auth = null;
    if (voteState.isAuthenticating) {
        auth = (
            <View style={styles.commentVote?.commentVoteAuth}>
                {!config.disableEmailInputs && (
                    <View>
                        <Text>{translations.ENTER_EMAIL_VOTE}</Text>
                        <TextInput
                            style={styles.commentVote?.authInput}
                            textContentType="emailAddress"
                            value={voteState.authEmail}
                            placeholder={translations.ENTER_EMAIL_VERIFICATION}
                            onChangeText={(newValue) => setVoteState({ authEmail: newValue })}
                        />
                    </View>
                )}
                <TextInput
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
