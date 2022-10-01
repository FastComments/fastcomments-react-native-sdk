// @ts-ignore TODO remove
import * as React from 'react';
import {View, Text, Image, TextInput, ActivityIndicator, Button, Linking} from 'react-native';
import type {
    CommentVoteResponse,
    CommentVoteDeleteResponse,
    FastCommentsCallbacks,
    RNComment,
    FastCommentsState,
    IFastCommentsStyles, ImageAssetConfig
} from "../types";
import {FastCommentsImageAsset} from "../types";
import {State, useHookstate} from "@hookstate/core";
import {getActionTenantId} from "../services/tenants";
import {createURLQueryString, makeRequest} from "../services/http";
import {newBroadcastId} from '../services/broadcast-id';
import {Pressable} from 'react-native';
import {FastCommentsRNConfig} from "../types/react-native-config";

export interface CommentVoteProps extends Pick<FastCommentsCallbacks, 'onVoteSuccess'> {
    state: State<FastCommentsState>
    comment: RNComment
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    styles: IFastCommentsStyles
    translations: Record<string, string>
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
        const tenantIdToUse = getActionTenantId({state: state, tenantId: comment.tenantId});

        if (comment.isVotedUp || comment.isVotedDown) {
            // delete vote
            const response = await makeRequest<CommentVoteDeleteResponse>({
                apiHost: state.apiHost.get(),
                method: 'DELETE',
                url: `/comments/${tenantIdToUse}/${comment._id}/vote/${comment.myVoteId}${createURLQueryString({
                    voteId: comment.myVoteId,
                    editKey: comment.editKey,
                    commentId: comment._id,
                    sso: state.ssoConfigString.get(),
                    broadcastId: newBroadcastId(),
                    urlId: state.config.urlId.get(),
                })}`
            });
            voteState.voteResponse.set(response);
            if (response.status === 'success') {
                onVoteSuccess && onVoteSuccess(comment, comment.myVoteId!, 'deleted', response.status);

                if (comment.isVotedUp) {
                    comment.isVotedUp = false;
                    if (!response.wasPendingVote) {
                        comment.votes = (comment.votes || 0) - 1;
                        comment.votesUp = (comment.votesUp || 0) - 1;
                    }
                } else {
                    comment.isVotedDown = false;
                    if (!response.wasPendingVote) {
                        comment.votes = (comment.votes || 0) + 1;
                        comment.votesDown = (comment.votesDown || 0) - 1;
                    }
                }
            }
        } else {
            // add vote
            const response = await makeRequest<CommentVoteResponse>({
                apiHost: state.apiHost.get(),
                method: 'POST',
                url: `/comments/${tenantIdToUse}/${comment._id}/vote${createURLQueryString({
                    urlId: state.config.urlId.get(),
                    sso: state.ssoConfigString.get(),
                    broadcastId: newBroadcastId(),
                    sessionId: currentUser && 'sessionId' in currentUser ? currentUser.sessionId : undefined
                })}`,
                body: {
                    voteDir: voteState.voteDir.get(),
                    commentId: comment._id,
                    urlId: state.config.urlId.get(),
                    url: state.config.url.get(),
                    commenterName: currentUser ? currentUser.username : voteState.authUserName.get(),
                    commenterEmail: currentUser && 'email' in currentUser ? currentUser.email : voteState.authEmail.get()
                }
            });
            voteState.voteResponse.set(response);
            if (response.status === 'success') {
                if (voteState.voteDir.get() === 'up') {
                    comment.isVotedUp = true;
                    comment.votes = (comment.votes || 0) + 1;
                    comment.votesUp = (comment.votesUp || 0) + 1;
                } else {
                    comment.isVotedDown = true;
                    comment.votes = (comment.votes || 0) - 1;
                    comment.votesDown = (comment.votesDown || 0) + 1;
                }
                comment.myVoteId = response.voteId;
                onVoteSuccess && onVoteSuccess(comment, response.voteId!, voteState.voteDir.get()!, response.status);
                if (response.editKey) {
                    comment.voteEditKey =response.editKey;
                } else {
                    comment.voteEditKey = undefined;
                }
                voteState.isAwaitingVerification.set(false);
            } else if (response.status === 'pending-verification') {
                if (voteState.voteDir.get() === 'up') {
                    comment.isVotedUp = true;
                } else {
                    comment.isVotedDown = true;
                }
                if (!response.isVerified) {
                    voteState.isAwaitingVerification.set(true);
                }
                comment.myVoteId =response.voteId;
                onVoteSuccess && onVoteSuccess(comment, response.voteId!, voteState.voteDir.get()!, response.status);
                comment.voteEditKey =response.editKey;
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
    const {comment, config, styles, translations, imageAssets} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const voteState = useHookstate<VoteState>({});
    if (config.disableVoting) {
        return null;
    }

    let voteOptions;
    let pendingVoteMessage;
    let auth;
    let error;

    const showDownVoting = !config.disableDownVoting;

    // TODO TouchableOpacity throws weird callback exceeded errors
    voteOptions = <View style={styles.commentVote?.commentVoteOptions}>
        {comment.votesUp ? <Text style={styles.commentVote?.votesUpText}>{Number(comment.votesUp).toLocaleString()}</Text> : null}
        <Pressable
            style={styles.commentVote?.voteButton}
            onPress={() => {
                voteState.voteDir.set('up');
                // noinspection JSIgnoredPromiseFromCall
                doVote({state, comment}, voteState);
            }}
        >
            <Image
                source={imageAssets[comment.isVotedUp ? (config.hasDarkBackground ? FastCommentsImageAsset.ICON_UP_ACTIVE_WHITE : FastCommentsImageAsset.ICON_UP_ACTIVE) : FastCommentsImageAsset.ICON_UP]}
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
                source={imageAssets[comment.isVotedDown ? (config.hasDarkBackground ? FastCommentsImageAsset.ICON_DOWN_ACTIVE_WHITE : FastCommentsImageAsset.ICON_DOWN_ACTIVE) : FastCommentsImageAsset.ICON_DOWN]}
                style={styles.commentVote?.voteButtonIcon}/>
        </Pressable>}
        {showDownVoting && comment.votesDown ? <Text style={styles.commentVote?.votesDownText}>{Number(comment.votesDown).toLocaleString()}</Text> : null}
    </View>

    if (voteState.isAuthenticating.get()) {
        auth = <View style={styles.commentVote?.commentVoteAuth}>
            {!config.disableEmailInputs && <View>
                <Text>{translations.ENTER_EMAIL_VOTE}</Text>
                <TextInput
                    style={styles.commentVote?.authInput}
                    textContentType='emailAddress'
                    value={voteState.authEmail.get()}
                    placeholder={translations.ENTER_EMAIL_VERIFICATION}
                    onChangeText={(newValue) => voteState.authEmail.set(newValue)}
                />
            </View>
            }
            <TextInput
                style={styles.commentVote?.authInput}
                textContentType='username'
                value={voteState.authUserName.get()}
                placeholder={translations.PUBLICLY_DISPLAYED_USERNAME}
                onChangeText={(newValue) => voteState.authUserName.set(newValue)}
            />
            <View style={styles.commentVote?.voteAuthButtons}>
                <Button title={translations.CANCEL} onPress={() => voteState.isAuthenticating.set(false)}/>
                <Button title={translations.SAVE_N_VOTE} onPress={() => doVote({state, comment}, voteState)}/>
            </View>
        </View>;
    }

    if (voteState.isAwaitingVerification.get()) {
        pendingVoteMessage =
            <Text style={styles.commentVote?.voteAwaitingVerificationMessage}>{translations.VOTE_APPLIES_AFTER_VERIFICATION}</Text>;
    }

    // This is here instead of above so that when it gets added in and then removed we don't cause the user to accidentally vote down if they double click.
    const lastVoteResponse = voteState.voteResponse.get();
    if (lastVoteResponse && lastVoteResponse.status === 'failed') {
        if (lastVoteResponse.code === 'banned') {
            let bannedText = translations.BANNED_VOTING;
            if (lastVoteResponse.bannedUntil) {
                bannedText += ' ' + translations.BAN_ENDS.replace('[endsText]', new Date(lastVoteResponse.bannedUntil).toLocaleString());
            }
            error = <Text style={styles.commentVote?.voteError}>{bannedText}</Text>
        } else if (lastVoteResponse.code && lastVoteResponse.code in ErrorCodesToMessageIds) {
            error = <Text style={styles.commentVote?.voteError}>{translations[ErrorCodesToMessageIds[lastVoteResponse.code]]}</Text>
        } else {
            error = <Text style={styles.commentVote?.voteError}>{translations.ERROR_MESSAGE}</Text>
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
