// @ts-ignore TODO remove
import * as React from 'react';
import {StyleSheet, View, Text, Image, TouchableOpacity, TextInput, ActivityIndicator, Button, Linking} from 'react-native';
import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types/image-asset";
import {State, useHookstate} from "@hookstate/core";
import {CommentVoteResponse} from "../types/dto/comment-vote";
import {getActionTenantId} from "../services/tenants";
import {createURLQueryString, makeRequest} from "../services/http";
import {newBroadcastId} from '../services/broadcast-id';
import {CommentVoteDeleteResponse} from '../types/dto/comment-vote-delete';

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

async function doVote({state, comment}: FastCommentsCommentWithState, voteState: State<VoteState>) {
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
            const commentState = state.commentState[comment._id.get()].get();
            const response = await makeRequest<CommentVoteDeleteResponse>({
                apiHost: state.apiHost.get(),
                method: 'DELETE',
                url: `/comments/${tenantIdToUse}/${comment._id.get()}/vote/${comment.myVoteId.get()}${createURLQueryString({
                    voteId: comment.myVoteId.get(),
                    editKey: commentState?.editKey,
                    commentId: comment._id.get(),
                    sso: state.ssoConfigString.get(),
                    broadcastId: newBroadcastId(),
                    urlId: state.config.urlId.get(),
                })}`
            });
            voteState.voteResponse.set(response);
            if (response.status === 'success') {
                // TODO
                // onVoteSuccess(config.instanceId, comment, comment.myVoteId, 'deleted', response.status);

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
                // TODO
                // onVoteSuccess(config.instanceId, comment, response.voteId, voteDir, response.status);
                if (response.editKey) {
                    state.commentState[comment._id.get()].set((commentState) => ({
                        ...commentState,
                        voteEditKey: response.editKey
                    }));
                } else {
                    state.commentState[comment._id.get()].set((commentState) => {
                        delete commentState?.editKey;
                        return commentState;
                    });
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
                // TODO
                // onVoteSuccess(config.instanceId, comment, response.voteId, voteDir, response.status);
                state.commentState[comment._id.get()].set((commentState) => ({
                    ...commentState,
                    voteEditKey: response.editKey
                }));
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

export function CommentVote({state, comment}: FastCommentsCommentWithState) {
    const voteState = useHookstate<VoteState>({});
    if (state.config.disableVoting.get()) {
        return null;
    }

    let voteOptions;
    let pendingVoteMessage;
    let auth;
    let error;

    voteOptions = <View style={styles.commentVoteOptions}>
        {comment.votesUp.get() ? <Text style={styles.votesUpText}>{Number(comment.votesUp.get()).toLocaleString()}</Text> : null}
        <TouchableOpacity
            style={styles.voteButton}
            onPress={() => {
                voteState.voteDir.set('up');
                // noinspection JSIgnoredPromiseFromCall
                doVote({state, comment}, voteState);
            }}
        >
            <Image
                source={state.imageAssets[comment.isVotedUp.get() ? FastCommentsImageAsset.ICON_UP_ACTIVE : FastCommentsImageAsset.ICON_UP].get()}
                style={styles.voteButtonIcon}/>
        </TouchableOpacity>
        <View style={styles.voteDivider}></View>
        <TouchableOpacity
            style={styles.voteButton}
            onPress={() => {
                voteState.voteDir.set('down');
                // noinspection JSIgnoredPromiseFromCall
                doVote({state, comment}, voteState);
            }}
        >
            <Image
                source={state.imageAssets[comment.isVotedDown.get() ? FastCommentsImageAsset.ICON_DOWN_ACTIVE : FastCommentsImageAsset.ICON_DOWN].get()}
                style={styles.voteButtonIcon}/>
        </TouchableOpacity>
        {comment.votesDown.get() ? <Text style={styles.votesDownText}>{Number(comment.votesDown.get()).toLocaleString()}</Text> : null}
    </View>

    if (voteState.isAuthenticating.get()) {
        auth = <View style={styles.commentVoteAuth}>
            {!state.config.disableEmailInputs.get() && <View>
                <Text>{state.translations.ENTER_EMAIL_VOTE.get()}</Text>
                <TextInput
                    style={styles.authInput}
                    textContentType='emailAddress'
                    value={voteState.authEmail.get()}
                    placeholder={state.translations.ENTER_EMAIL_VERIFICATION.get()}
                    onChangeText={(newValue) => voteState.authEmail.set(newValue)}
                />
            </View>
            }
            <TextInput
                style={styles.authInput}
                textContentType='username'
                value={voteState.authUserName.get()}
                placeholder={state.translations.PUBLICLY_DISPLAYED_USERNAME.get()}
                onChangeText={(newValue) => voteState.authUserName.set(newValue)}
            />
            <View style={styles.voteAuthButtons}>
                <Button title={state.translations.CANCEL.get()} onPress={() => voteState.isAuthenticating.set(false)}/>
                <Button title={state.translations.SAVE_N_VOTE.get()} onPress={() => doVote({state, comment}, voteState)}/>
            </View>
        </View>;
    }

    if (voteState.isAwaitingVerification.get()) {
        pendingVoteMessage = <Text style={styles.voteAwaitingVerificationMessage}>{state.translations.VOTE_APPLIES_AFTER_VERIFICATION.get()}</Text>;
    }

    // This is here instead of above so that when it gets added in and then removed we don't cause the user to accidentally vote down if they double click.
    const lastVoteResponse = voteState.voteResponse.get();
    if (lastVoteResponse && lastVoteResponse.status === 'failed') {
        if (lastVoteResponse.code === 'banned') {
            let bannedText = state.translations.BANNED_VOTING.get();
            if (lastVoteResponse.bannedUntil) {
                bannedText += ' ' + state.translations.BAN_ENDS.get().replace('[endsText]', new Date(lastVoteResponse.bannedUntil).toLocaleString());
            }
            error = <Text style={styles.voteError}>{bannedText}</Text>
        } else if (lastVoteResponse.code && lastVoteResponse.code in ErrorCodesToMessageIds) {
            error = <Text style={styles.voteError}>{state.translations[ErrorCodesToMessageIds[lastVoteResponse.code]].get()}</Text>
        } else {
            error = <Text style={styles.voteError}>{state.translations.ERROR_MESSAGE.get()}</Text>
        }
    }

    return <View>
        {voteOptions}
        {pendingVoteMessage}
        {auth}
        {error}
        {voteState.isLoading.get() && <View style={styles.loadingView}>
            <ActivityIndicator size="small"/>
        </View>}
    </View>;
}

const styles = StyleSheet.create({
    commentVoteOptions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyItems: 'center',
        justifyContent: 'space-between',
        "marginTop": 0,
        "marginRight": 7,
        "marginBottom": 0,
        "marginLeft": 2,
    },
    votesUpText: {
        fontSize: 12,
        marginRight: 5
    },
    votesDownText: {
        fontSize: 12,
        marginLeft: 5
    },
    voteButton: {
        height: 22,
        justifyContent: 'center'
    },
    voteButtonIcon: {
        height: 12,
        aspectRatio: 1,
        resizeMode: 'center'
    },
    voteDivider: {
        backgroundColor: '#c2c2c2',
        width: 1,
        height: 20,
        marginRight: 10,
        marginLeft: 10
    },
    commentVoteAuth: {
        maxWidth: 400,
        "marginTop": 10,
        "paddingTop": 9,
        "paddingRight": 12,
        "paddingBottom": 9,
        "paddingLeft": 12,
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 6,
        "borderBottomRightRadius": 6,
        "borderBottomLeftRadius": 6,
        "fontSize": 14,
        "borderWidth": 1,
        "borderColor": "#a2a2a2",
        "borderStyle": "solid"
    },
    authInput: {
        "marginTop": 10,
        "marginRight": 0,
        "marginBottom": 10,
        "marginLeft": 0,
        "fontSize": 13
    },
    loadingView: {
        // TODO common
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff80'
    },
    voteAuthButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    voteAwaitingVerificationMessage: {},
    voteError: {},
})
