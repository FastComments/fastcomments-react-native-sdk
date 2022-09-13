// @ts-ignore TODO remove
import * as React from 'react';
import {View, Text, Image, TextInput, ActivityIndicator, Button, Linking} from 'react-native';
import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types/image-asset";
import {none, State, useHookstate} from "@hookstate/core";
import {CommentVoteResponse} from "../types/dto/comment-vote";
import {getActionTenantId} from "../services/tenants";
import {createURLQueryString, makeRequest} from "../services/http";
import {newBroadcastId} from '../services/broadcast-id';
import {CommentVoteDeleteResponse} from '../types/dto/comment-vote-delete';
import {Pressable} from 'react-native';
import type {FastCommentsCallbacks} from "../types";

export interface CommentVoteProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess'> {
}

interface VoteState {
    voteDir?: 'up' | 'down'
    isLoading?: boolean
    isAuthenticating?: boolean
    /** Message only shown after voting, not every time viewing thread. **/
    isAwaitingVerification?: boolean
    authEmail?: string
    authUserName?: string
    voteResponse?: CommentVoteResponse
}

const ErrorCodesToMessageIds: Record<string, string> = {
    'username-taken': 'USERNAME_TAKEN_DIFF_EMAIL',
    // this shouldn't normally show, should only show during weird network related race conditions.
    'already-voted': 'ALREADY_VOTED',
}

async function doVote({state, comment, onVoteSuccess}: Pick<CommentVoteProps, 'state' | 'comment' | 'onVoteSuccess'>, voteState: State<VoteState>) {
    const currentUser = state.currentUser.get();
    if (!currentUser) {
        if (voteState.authUserName.get() && (state.config.allowAnon.get() || voteState.authEmail.get())) {
            // has authentication info
        } else {
            const sso = state.config.sso.get();
            if (sso && !state.config.allowAnon.get()) {
                // go to url or call sso login callback
                if (sso.loginURL) {
                    return await Linking.openURL(sso.loginURL);
                }
                if (sso.loginCallback) {
                    return sso.loginCallback('');
                }
            } else {
                // show auth form
                return voteState.isAuthenticating.set(true);
            }
        }
    }
    voteState.isLoading.set(true);
    try {
        const tenantIdToUse = getActionTenantId({state: state, tenantId: comment.tenantId.get()});

        if (comment.isVotedUp.get() || comment.isVotedDown.get()) {
            // delete vote
            const response = await makeRequest<CommentVoteDeleteResponse>({
                apiHost: state.apiHost.get(),
                method: 'DELETE',
                url: `/comments/${tenantIdToUse}/${comment._id.get()}/vote/${comment.myVoteId.get()}${createURLQueryString({
                    voteId: comment.myVoteId.get(),
                    editKey: comment.editKey.get(),
                    commentId: comment._id.get(),
                    sso: state.ssoConfigString.get(),
                    broadcastId: newBroadcastId(),
                    urlId: state.config.urlId.get(),
                })}`
            });
            voteState.voteResponse.set(response);
            if (response.status === 'success') {
                onVoteSuccess && onVoteSuccess(comment.get(), comment.myVoteId.get()!, 'deleted', response.status);

                if (comment.isVotedUp.get()) {
                    comment.isVotedUp.set(false);
                    if (!response.wasPendingVote) {
                        comment.votes.set((votes) => (votes || 0) - 1);
                        comment.votesUp.set((votesUp) => (votesUp || 0) - 1);
                    }
                } else {
                    comment.isVotedDown.set(false);
                    if (!response.wasPendingVote) {
                        comment.votes.set((votes) => (votes || 0) + 1);
                        comment.votesDown.set((votesDown) => (votesDown || 0) - 1);
                    }
                }
            }
        } else {
            // add vote
            const response = await makeRequest<CommentVoteResponse>({
                apiHost: state.apiHost.get(),
                method: 'POST',
                url: `/comments/${tenantIdToUse}/${comment._id.get()}/vote${createURLQueryString({
                    urlId: state.config.urlId.get(),
                    sso: state.ssoConfigString.get(),
                    broadcastId: newBroadcastId(),
                    sessionId: currentUser && 'sessionId' in currentUser ? currentUser.sessionId : undefined
                })}`,
                body: {
                    voteDir: voteState.voteDir.get(),
                    commentId: comment._id.get(),
                    urlId: state.config.urlId.get(),
                    url: state.config.url.get(),
                    commenterName: currentUser ? currentUser.username : voteState.authUserName.get(),
                    commenterEmail: currentUser && 'email' in currentUser ? currentUser.email : voteState.authEmail.get()
                }
            });
            voteState.voteResponse.set(response);
            if (response.status === 'success') {
                if (voteState.voteDir.get() === 'up') {
                    comment.isVotedUp.set(true);
                    comment.votes.set((votes) => (votes || 0) + 1);
                    comment.votesUp.set((votesUp) => (votesUp || 0) + 1);
                } else {
                    comment.isVotedDown.set(true);
                    comment.votes.set((votes) => (votes || 0) - 1);
                    comment.votesDown.set((votesDown) => (votesDown || 0) + 1);
                }
                comment.myVoteId.set(response.voteId);
                onVoteSuccess && onVoteSuccess(comment.get(), response.voteId!, voteState.voteDir.get()!, response.status);
                if (response.editKey) {
                    comment.voteEditKey.set(response.editKey);
                } else {
                    comment.voteEditKey.set(none);
                }
                voteState.isAwaitingVerification.set(false);
            } else if (response.status === 'pending-verification') {
                if (voteState.voteDir.get() === 'up') {
                    comment.isVotedUp.set(true);
                } else {
                    comment.isVotedDown.set(true);
                }
                if (!response.isVerified) {
                    voteState.isAwaitingVerification.set(true);
                }
                comment.myVoteId.set(response.voteId);
                onVoteSuccess && onVoteSuccess(comment.get(), response.voteId!, voteState.voteDir.get()!, response.status);
                comment.voteEditKey.set(response.editKey);
                voteState.isAwaitingVerification.set(false);
            } else {
                if (response.code === 'already-voted') {
                    // we'll show a message based on this response code.
                    voteState.isAwaitingVerification.set(false);
                } else if (response.code === 'username-taken') {
                    // we'll show a message based on this response code.
                    // keep auth input open so they can change username input value
                } else if (response.code === 'banned') {
                    // we'll show a message based on this response code.
                }
            }
        }
    } catch (e) {
        console.error('Failed to vote', e);
    }
    voteState.isLoading.set(false);
}

export function CommentVote(props: CommentVoteProps) {
    const {comment, styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const voteState = useHookstate<VoteState>({});
    if (state.config.disableVoting.get()) {
        return null;
    }

    let voteOptions;
    let pendingVoteMessage;
    let auth;
    let error;

    const showDownVoting = !state.config.disableDownVoting.get();

    // TODO TouchableOpacity throws weird callback exceeded errors
    voteOptions = <View style={styles.commentVote?.commentVoteOptions}>
        {comment.votesUp.get() ? <Text style={styles.commentVote?.votesUpText}>{Number(comment.votesUp.get()).toLocaleString()}</Text> : null}
        <Pressable
            style={styles.commentVote?.voteButton}
            onPress={() => {
                voteState.voteDir.set('up');
                // noinspection JSIgnoredPromiseFromCall
                doVote({state, comment}, voteState);
            }}
        >
            <Image
                source={state.imageAssets[comment.isVotedUp.get() ? (state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_UP_ACTIVE_WHITE : FastCommentsImageAsset.ICON_UP_ACTIVE) : FastCommentsImageAsset.ICON_UP].get()}
                style={styles.commentVote?.voteButtonIcon}/>
        </Pressable>
        {showDownVoting && <View style={styles.commentVote?.voteDivider}/>}
        {showDownVoting && <Pressable
            style={styles.commentVote?.voteButton}
            onPress={() => {
                voteState.voteDir.set('down');
                // noinspection JSIgnoredPromiseFromCall
                doVote({state, comment}, voteState);
            }}
        >
            <Image
                source={state.imageAssets[comment.isVotedDown.get() ? (state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_DOWN_ACTIVE_WHITE : FastCommentsImageAsset.ICON_DOWN_ACTIVE) : FastCommentsImageAsset.ICON_DOWN].get()}
                style={styles.commentVote?.voteButtonIcon}/>
        </Pressable>}
        {showDownVoting && comment.votesDown.get() ? <Text style={styles.commentVote?.votesDownText}>{Number(comment.votesDown.get()).toLocaleString()}</Text> : null}
    </View>

    if (voteState.isAuthenticating.get()) {
        auth = <View style={styles.commentVote?.commentVoteAuth}>
            {!state.config.disableEmailInputs.get() && <View>
                <Text>{state.translations.ENTER_EMAIL_VOTE.get()}</Text>
                <TextInput
                    style={styles.commentVote?.authInput}
                    textContentType='emailAddress'
                    value={voteState.authEmail.get()}
                    placeholder={state.translations.ENTER_EMAIL_VERIFICATION.get()}
                    onChangeText={(newValue) => voteState.authEmail.set(newValue)}
                />
            </View>
            }
            <TextInput
                style={styles.commentVote?.authInput}
                textContentType='username'
                value={voteState.authUserName.get()}
                placeholder={state.translations.PUBLICLY_DISPLAYED_USERNAME.get()}
                onChangeText={(newValue) => voteState.authUserName.set(newValue)}
            />
            <View style={styles.commentVote?.voteAuthButtons}>
                <Button title={state.translations.CANCEL.get()} onPress={() => voteState.isAuthenticating.set(false)}/>
                <Button title={state.translations.SAVE_N_VOTE.get()} onPress={() => doVote({state, comment}, voteState)}/>
            </View>
        </View>;
    }

    if (voteState.isAwaitingVerification.get()) {
        pendingVoteMessage =
            <Text style={styles.commentVote?.voteAwaitingVerificationMessage}>{state.translations.VOTE_APPLIES_AFTER_VERIFICATION.get()}</Text>;
    }

    // This is here instead of above so that when it gets added in and then removed we don't cause the user to accidentally vote down if they double click.
    const lastVoteResponse = voteState.voteResponse.get();
    if (lastVoteResponse && lastVoteResponse.status === 'failed') {
        if (lastVoteResponse.code === 'banned') {
            let bannedText = state.translations.BANNED_VOTING.get();
            if (lastVoteResponse.bannedUntil) {
                bannedText += ' ' + state.translations.BAN_ENDS.get().replace('[endsText]', new Date(lastVoteResponse.bannedUntil).toLocaleString());
            }
            error = <Text style={styles.commentVote?.voteError}>{bannedText}</Text>
        } else if (lastVoteResponse.code && lastVoteResponse.code in ErrorCodesToMessageIds) {
            error = <Text style={styles.commentVote?.voteError}>{state.translations[ErrorCodesToMessageIds[lastVoteResponse.code]].get()}</Text>
        } else {
            error = <Text style={styles.commentVote?.voteError}>{state.translations.ERROR_MESSAGE.get()}</Text>
        }
    }

    return <View style={styles.commentVote?.root}>
        {voteOptions}
        {pendingVoteMessage}
        {auth}
        {error}
        {voteState.isLoading.get() && <View style={styles.commentVote?.loadingView}>
            <ActivityIndicator size="small"/>
        </View>}
    </View>;
}
