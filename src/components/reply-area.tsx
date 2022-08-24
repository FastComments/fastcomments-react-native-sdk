// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View, Text, StyleSheet, Pressable, Image, Linking, ActivityIndicator} from "react-native";
import {State} from "@hookstate/core";
import {FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsImageAsset} from '../types/image-asset';
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {ModalMenu} from "./modal-menu";
import {Dispatch, SetStateAction, useState} from 'react';
import {ThreeDot} from "./three-dot";
import {NotificationBell} from "./notification-bell";
import {CommentAreaMessage} from "./comment-area-message";
import {CommentTextArea} from "./comment-text-area";
import {SaveCommentResponse} from "../types/dto/save-comment-response";
import {getActionTenantId, getActionURLID} from "../services/tenants";
import {newBroadcastId} from "../services/broadcast-id";
import {createURLQueryString, makeRequest} from "../services/http";
import {handleNewCustomConfig} from "../services/custom-config";
import {incOverallCommentCount} from "../services/comment-count";
import {addCommentToTree} from "../services/comment-trees";
import {setupUserPresenceState} from "../services/user-presense";

export interface ReplyAreaState {
    state: State<FastCommentsState>
    parentComment?: State<FastCommentsWidgetComment> | null
}

interface CommentReplyState {
    username?: string
    email?: string
    websiteUrl?: string
    comment?: string
    isReplySaving: boolean
    showSuccessMessage: boolean
    lastSaveResponse?: SaveCommentResponse
}

async function logout(_state: State<FastCommentsState>) {
    // TODO
    // if (config.sso) {
    //     if (config.sso.logoutURL) {
    //         return redirect(config.instanceId, config.sso.logoutURL);
    //     } else if (config.sso.logoutCallback) {
    //         if (config.sso.logoutCallback instanceof Function) {
    //             config.sso.logoutCallback(config.instanceId);
    //         } else {
    //             logout(config.instanceId);
    //         }
    //     }
    // }
    //
    // const parentId = getNamedItem(event, 'data-parent-id').value;
    //
    // delete logoutFailureById[parentId];
    //
    // makeRequest(config, 'PUT', '/auth/logout', null, function () {
    //     let currentUserId = currentUser ? currentUser.id : null;
    //     currentUser = null;
    //
    //     if (config.sso) {
    //         // reset SSO state to prevent confusion if developer doesn't reload widget
    //         config.sso.userDataJSONBase64 = null;
    //         config.sso.verificationHash = null;
    //     }
    //
    //     // if we allow anon, just turn off SSO in API calls - since we will just use anon commenting until widget is reloaded with SSO config again.
    //     ssoConfigString = config.allowAnon ? null : config.sso ? JSON.stringify(config.sso) : null;
    //     persistSubscriberState(urlIdWS, tenantIdWS, null); // reconnect w/o a user
    //     onAuthenticationChange(config.instanceId, 'logout', currentUser);
    //     for (const key in NotificationState) {
    //         delete NotificationState[key];
    //     }
    //     delete UserPresenceState.usersOnlineMap[currentUserId];
    //     delete UserPresenceState.userIdsToCommentIds[currentUserId];
    //     setupUserPresenceState(targetElement, config, translations, urlIdWS, UserPresenceState, commentsById, commentsTree);
    //     saveUIStateAndRestore(renderCommentsTree);
    // }, function () {
    //     logoutFailureById[parentId] = true;
    //     saveUIStateAndRestore(renderCommentsTree);
    // });
}

async function submit({
                          state,
                          parentComment
                      }: ReplyAreaState,
                      commentReplyState: CommentReplyState
): Promise<CommentReplyState> { // returns a new CommentReplyState
    if (state.config.readonly.get()) {
        return commentReplyState;
    }
    const replyingToId = parentComment?._id.get();

    let isAuthenticating = false;
    const allowAnon = state.config.allowAnon.get();

    if ((!allowAnon && (!commentReplyState.username || (!allowAnon && !commentReplyState.email))) || !commentReplyState.comment) {
        return commentReplyState;
    }
    // TODO validate email
    // if (!allowAnon && ... is email invalid ...) {
    //     return;
    // }

    const currentUserBeforeSubmit = state.currentUser.get();
    const lastCurrentUserId = currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;
    if (!currentUserBeforeSubmit && commentReplyState.username) {
        isAuthenticating = true;
    }

    const tenantIdToUse = getActionTenantId({state, tenantId: parentComment?.tenantId.get()});
    const urlIdToUse = getActionURLID({state, urlId: parentComment?.urlId.get()});

    const date = new Date();

    const newComment = {
        tenantId: tenantIdToUse,
        urlId: urlIdToUse,
        url: state.config.url.get(),
        pageTitle: state.config.pageTitle.get(),
        commenterName: currentUserBeforeSubmit ? currentUserBeforeSubmit.username : commentReplyState.username,
        commenterEmail: currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit ? currentUserBeforeSubmit.email : commentReplyState.email,
        commenterLink: currentUserBeforeSubmit && 'websiteUrl' in currentUserBeforeSubmit ? currentUserBeforeSubmit.websiteUrl : commentReplyState.websiteUrl,
        avatarSrc: currentUserBeforeSubmit && state.config.simpleSSO.get() ? currentUserBeforeSubmit.avatarSrc : undefined,
        comment: commentReplyState.comment,
        parentId: replyingToId,
        date: date.valueOf(),
        localDateString: date.toString(),
        localDateHours: date.getHours(),
        productId: state.config.productId.get(),
        meta: state.config.commentMeta.get(),
        // mentions: inputElement.currentCommentMentions, TODO
        // hashTags: inputElement.currentCommentHashTags, TODO
        moderationGroupIds: state.config.moderationGroupIds.get(),
        isFromMyAccountPage: state.config.tenantId.get() === 'all'
    };

    // extensions.forEach((extension) => {
    //     extension.prepareCommentForSaving && extension.prepareCommentForSaving(newComment, replyingToId);
    // });

    const broadcastId = newBroadcastId();

    try {
        const response = await makeRequest<SaveCommentResponse>({
            apiHost: state.apiHost.get(),
            method: 'POST',
            url: `/comments/${tenantIdToUse}/${createURLQueryString({
                urlId: urlIdToUse,
                sso: state.ssoConfigString.get(),
                broadcastId,
                sessionId: currentUserBeforeSubmit && 'sessionId' in currentUserBeforeSubmit ? currentUserBeforeSubmit.sessionId : undefined,
            })}`,
            body: newComment
        });

        let showSuccessMessage = false;
        if (response.customConfig) {
            handleNewCustomConfig(state, response.customConfig);
        }
        if (response.status === 'success' && response.comment) {
            // TODO
            // onReplySuccess(config.instanceId, response.comment);
            state.commentState[response.comment._id].set({
                wasPostedCurrentSession: true
            });
            state.commentCountOnClient.set((commentCountOnClient) => {
                commentCountOnClient++;
                return commentCountOnClient
            });
            state.commentsById[response.comment._id].set(response.comment);
            if (replyingToId) {
                state.commentState[replyingToId].set((parentState) => {
                    if (!parentState) {
                        parentState = {};
                    }
                    parentState.repliesHidden = false;
                    return parentState;
                });
            }
            addCommentToTree(state.allComments, state.commentsTree, state.commentsById, response.comment, !!state.config.newCommentsToBottom);
            incOverallCommentCount(state.config.countAll.get(), state, response.comment.parentId);

            if (response.user) {
                if (state.config.simpleSSO.get()) { // for avatar, for example. TODO CLEANUP
                    state.currentUser.merge(response.user);
                } else {
                    state.currentUser.set(response.user);
                }
                // TODO
                // onAuthenticationChange(config.instanceId, 'user-set', currentUserBeforeSubmit);
            }

            if (currentUserBeforeSubmit && response.user && 'sessionId' in response.user && response.user.sessionId) {
                state.currentUser.merge({
                    sessionId: response.user.sessionId
                });
                // TODO
                // onAuthenticationChange(config.instanceId, 'session-id-set', currentUserBeforeSubmit);
            }
            if (replyingToId === null && !state.config.disableSuccessMessage.get()) {
                showSuccessMessage = true;
            }
        } else {
            if (isAuthenticating) {
                state.currentUser.set(null); // saved to authenticate - can't say we are logged in.
                // TODO
                // onAuthenticationChange(config.instanceId, 'authentication-failed', newComment);
            }
            if (response.translations) {
                state.config.translations.merge(response.translations);
            }
        }
        incOverallCommentCount(state.config.countAll.get(), state, replyingToId);
        const newCurrentUserId = currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;

        // reconnect to new websocket channel if needed
        if (newCurrentUserId !== lastCurrentUserId || response.userIdWS !== state.userIdWS.get()) {
            // TODO
            // persistSubscriberState(urlIdWS, tenantIdWS, response.userIdWS);
        } else {
            // noinspection ES6MissingAwait
            setupUserPresenceState(state, response.userIdWS!);
        }

        // TODO
        // extensions.forEach((extension) => {
        //     if (extension.newComment) {
        //         extension.newComment(response.comment);
        //     }
        // });
        //
        // extensions.forEach((extension) => {
        //     if (extension.onReplySuccess) {
        //         extension.onReplySuccess(response.comment);
        //     }
        // });
        if (response.maxCharacterLength && response.maxCharacterLength !== state.config.maxCommentCharacterLength.get()) {
            state.config.maxCommentCharacterLength.set(response.maxCharacterLength); // update UI
        }
        return {
            username: commentReplyState.username,
            email: commentReplyState.email,
            websiteUrl: commentReplyState.websiteUrl,
            comment: commentReplyState.comment,
            isReplySaving: false,
            showSuccessMessage,
            lastSaveResponse: response
        };
    } catch (response: any) {
        if ('customConfig' in response && response.customConfig) {
            handleNewCustomConfig(state, response.customConfig);
        }
        if (isAuthenticating) {
            state.currentUser.set(null); // saved to authenticate - can't say we are logged in.
            // TODO
            // onAuthenticationChange(config.instanceId, 'authentication-failed', newComment);
        }
        return {
            username: commentReplyState.username,
            email: commentReplyState.email,
            websiteUrl: commentReplyState.websiteUrl,
            comment: commentReplyState.comment,
            isReplySaving: false,
            showSuccessMessage: false,
            lastSaveResponse: response
        };
    }
}

export function ReplyArea({state, parentComment}: ReplyAreaState) {
    // parentId check is so that we don't allow new comments to root, but we do allow new comments **inline**
    if (state.config.readonly.get() || (!parentComment && state.config.noNewRootComments.get())) {
        return null;
    }

    const [commentReplyState, setNewCommentState] = useState<CommentReplyState>({
        isReplySaving: false,
        showSuccessMessage: false
    });

    const currentUser = state.currentUser?.get();

    const replyToText = parentComment
        ? (
            currentUser
                ? <Text
                    style={styles.replyingTo}>{state.translations.REPLYING_TO_AS.get().replace('[to]', parentComment.commenterName.get() as string).replace('[from]', currentUser.username)}</Text>
                : <Text
                    style={styles.replyingTo}>{state.translations.REPLYING_TO.get().replace('[to]', parentComment.commenterName.get() as string)}</Text>
        ) : null;

    const ssoConfig = state.config.sso?.get() || state.config.simpleSSO?.get();
    let ssoLoginWrapper;
    let topBar;
    let commentInputArea;
    let commentSubmitButton;

    if (!currentUser && ssoConfig && !state.config.allowAnon.get()) {
        if (ssoConfig.loginURL || ssoConfig.loginCallback) { // if they don't define a URL, we just show a message.
            ssoLoginWrapper = <View style={styles.ssoLoginWrapper}>
                <Pressable style={styles.ssoLoginButton} onPress={async () => {
                    if (ssoConfig.loginURL) {
                        await Linking.openURL(ssoConfig.loginURL);
                    } else if (ssoConfig?.loginCallback) {
                        ssoConfig.loginCallback(''); // we do not need instance id in react widget
                    }
                }
                }>
                    <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE].get()} style={{width: 22, height: 22}}/>
                    <Text>{state.translations.LOG_IN.get()}</Text>
                </Pressable>
            </View>;
        } else {
            ssoLoginWrapper = <View style={styles.ssoLoginWrapper}>
                <View style={styles.ssoLoginButton}>
                    <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE].get()} style={{width: 22, height: 22}}/>
                    <Text>{state.translations.LOG_IN_TO_COMMENT.get()}</Text>
                </View>
            </View>;
        }
    } else {
        if (!parentComment?.get() && currentUser) {
            topBar = <View style={styles.topBar}>
                <View style={styles.loggedInInfo}>
                    <Image style={styles.topBarAvatar} source={currentUser.avatarSrc ? {uri: currentUser.avatarSrc} : getDefaultAvatarSrc(state)}/>
                    <Text style={styles.topBarUsername}>{currentUser.username}</Text>
                </View>
                <View style={styles.topBarRight}>
                    {(!ssoConfig || (ssoConfig && (ssoConfig.logoutURL || ssoConfig.logoutCallback)))
                    && <ModalMenu state={state} items={[
                        {
                            id: 'logout',
                            label: state.translations.LOG_OUT.get(),
                            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                                await logout(state);
                                setModalId(null)
                            }
                        }
                    ]} openButton={<ThreeDot/>}/>
                    }
                </View>
                <NotificationBell state={state}/>
            </View>;
        }

        let commentInputAreaContent;
        if (commentReplyState.showSuccessMessage) {
            commentInputAreaContent = CommentAreaMessage(state.translations.COMMENT_HAS_BEEN_SUBMITTED.get());
        } else {
            commentInputAreaContent =
                <CommentTextArea state={state} value={commentReplyState.comment}
                                 onChangeText={(newValue: string) => setNewCommentState({...commentReplyState, comment: newValue})}/>;
        }

        commentInputArea = <View style={[styles.commentInputArea, (commentReplyState.isReplySaving ? styles.commentInputAreaReplySaving : null)]}>
            {commentInputAreaContent}
        </View>;

        // TODO fancy borders like on web
        // result += '<div class="horizontal-border-wrapper">';
        // result += '<div class="horizontal-border horizontal-border-top-left"></div>';
        // result += '<div class="horizontal-border horizontal-border-top-right"></div>';
        // result += '<div class="horizontal-border horizontal-border-left"></div>';
        // result += '<div class="horizontal-border horizontal-border-right"></div>';
        // result += '<div class="horizontal-border horizontal-border-bottom-left"></div>';
        // result += '<div class="horizontal-border horizontal-border-bottom-right"></div>';
        // result += '</div>';

        if (!commentReplyState.isReplySaving) {
            commentSubmitButton = <View style={styles.replyButtonWrapper}>
                <Pressable style={styles.replyButton} onPress={async () => {
                    if (commentReplyState.showSuccessMessage && !parentComment) {
                        setNewCommentState((commentReplyState) => {
                            commentReplyState.showSuccessMessage = false;
                            return commentReplyState;
                        });
                        // TODO focus on text area
                    } else {
                        setNewCommentState((commentReplyState) => {
                            commentReplyState.isReplySaving = true;
                            return commentReplyState;
                        });
                        try {
                            const submitResponse = await submit({state, parentComment}, commentReplyState);
                            setNewCommentState({
                                username: undefined,
                                email: undefined,
                                websiteUrl: undefined,
                                comment: undefined,
                                isReplySaving: false,
                                showSuccessMessage: submitResponse.showSuccessMessage,
                                lastSaveResponse: submitResponse.lastSaveResponse
                            });
                        } catch (e) {
                            console.error('Failed to save a comment', e);
                        }
                        setNewCommentState((commentReplyState) => {
                            commentReplyState.isReplySaving = false;
                            return commentReplyState;
                        });
                    }
                }}>
                    <Text>{commentReplyState.showSuccessMessage ? state.translations.WRITE_ANOTHER_COMMENT.get() : state.translations.SUBMIT_REPLY.get()}</Text>
                    <Image
                        source={parentComment ? state.imageAssets[FastCommentsImageAsset.ICON_RETURN].get() : state.imageAssets[FastCommentsImageAsset.ICON_BUBBLE].get()}
                        style={{width: 22, height: 22}}/>
                </Pressable>
            </View>;
        }

        // TODO
        // if (!currentUser || (responseFailureById[parentId] === true || (typeof responseFailureById[parentId] === 'object' && SignUpErrorsTranslationIds[responseFailureById[parentId].code]))) { // checking for just true here causes the user to appear to logout on any failure, which is weird.
        //     result += '<div class="user-info-input auth-input default-hidden">';
        //     if (ssoConfig && !config.allowAnon) {
        //         if (ssoConfig.loginURL || ssoConfig.loginCallback) {
        //             result += '<a class="sso-login" ' + (ssoConfig.loginURL ? 'href="' + ssoConfig.loginURL + '"' : '') + '>' + translations.LOG_IN + '</a>';
        //         }
        //     } else {
        //         if (ssoConfig && (ssoConfig.loginURL || ssoConfig.loginCallback)) {
        //             result += '<a class="sso-login" ' + (ssoConfig.loginURL ? 'href="' + ssoConfig.loginURL + '"' : '') + '>' + translations.HAVE_AN_ACCOUNT + '</a>';
        //         }
        //
        //         if (!config.disableEmailInputs) {
        //             result += '<div class="reasoning">' + (config.allowAnon ? translations.ENTER_EMAIL_TO_KEEP_COMMENT : translations.ENTER_EMAIL_TO_COMMENT) + '</div>';
        //
        //             // Using autocomplete=email or on here doesn't seem to do anything.
        //             result += '<input name="fastcomments-email" ' + (config.allowAnon ? '' : 'required') + ' type="email" id="email-input-for-parent-' + parentId + '" data-restore-id="fce-' + parentId + '" placeholder="' + translations.EMAIL_FOR_VERIFICATION + '" maxlength="70" />';
        //         }
        //
        //         // We intentionally don't use autocomplete here. If we use autocomplete=username, then this will auto fill with the user's email, which we don't want to use as a username.
        //         result += '<input name="fastcomments-username" required type="text" id="username-input-for-parent-' + parentId + '" data-restore-id="fcu-' + parentId + '" placeholder="' + translations.PUBLICLY_DISPLAYED_USERNAME + '" maxlength="70" ' + (config.defaultUsername ? 'value="' + config.defaultUsername + '"' : '') + ' />';
        //
        //         if (config.enableCommenterLinks) {
        //             result += '<input name="fastcomments-link" type="url" id="link-input-for-parent-' + parentId + '" data-restore-id="fcl-' + parentId + '" placeholder="' + translations.ENTER_A_LINK + '" maxlength="500" />';
        //         }
        //
        //         if (responseFailureById[parentId] && SignUpErrorsTranslationIds[responseFailureById[parentId].code]) {
        //             result += '<div class="fc-red">' + translations[SignUpErrorsTranslationIds[responseFailureById[parentId].code]] + '</div>';
        //         }
        //
        //         if (VERSION === 2) {
        //             if (!config.disableEmailInputs) {
        //                 result += '<div class="solicitation-info">' + translations.NO_SOLICITATION_EMAILS + '</div>';
        //             }
        //
        //             if (!commentReplyState.isReplySaving || responseFailureById[parentId]) {
        //                 result += '<button type="submit" data-parent-id="' + parentId + '" class="fast-comments-reply">' + translations.SUBMIT + '</button>';
        //             }
        //         }
        //     }
        //
        //     result += '</div>';
        // }

        // We don't allow cancelling when replying to top-level comments.
        if (parentComment) {
            // TODO
            // result += '<div class="cancel-button-wrapper">';
            // result += '<button type="button" data-parent-id="' + parentId + '" class="fast-comments-reply-cancel default-hidden" type="button" title="' + translations.CANCEL_REPLY + '"><div class="icon cross"></div></button>';
            //
            // result += '</div>';
        }
    }

    let displayError;
    const lastSaveResponse = commentReplyState.lastSaveResponse;

    if (lastSaveResponse && lastSaveResponse.status !== 'success') {
        if (lastSaveResponse.code === 'banned') {
            let bannedText = state.translations.BANNED_COMMENTING.get();
            if (lastSaveResponse.bannedUntil) {
                bannedText += ' ' + state.translations.BAN_ENDS.get().replace('[endsText]', new Date(lastSaveResponse.bannedUntil).toLocaleString());
            }
            displayError = <Text style={styles.error}>{bannedText}</Text>;
        } else if (lastSaveResponse.code === 'user-rate-limited') {
            displayError = <Text style={styles.error}>state.translations.COMMENTING_TOO_QUICKLY.get()</Text>;
        } else if (lastSaveResponse.code === 'rate-limited') {
            displayError = <Text style={styles.error}>state.translations.RATE_LIMITED.get()</Text>;
        } else if (lastSaveResponse.code === 'profile-comments-private') {
            displayError = <Text style={styles.error}>state.translations.PROFILE_COMMENTS_PRIVATE.get()</Text>;
        } else if (lastSaveResponse.code === 'profile-dm-private') {
            displayError = <Text style={styles.error}>state.translations.PROFILE_DM_PRIVATE.get()</Text>;
        } else if (lastSaveResponse.code === 'comment-too-big') {
            displayError =
                <Text style={styles.error}>state.translations.COMMENT_TOO_BIG.get().replace('[count]', lastSaveResponse.maxCharacterLength +
                    '')</Text>;
        } else if (lastSaveResponse.translatedError) {
            displayError = <Text style={styles.error}>lastSaveResponse.translatedError</Text>;
        } else if (lastSaveResponse.code) {
            // TODO this case should probably be deprecated and replaced by the server sending translatedError
            const translatedError = state.translations[lastSaveResponse.code].get();
            displayError = <Text style={styles.error}>{translatedError}</Text>;
        } else {
            // generic error
            displayError = <Text style={styles.error}>state.translations.ERROR_MESSAGE.get()</Text>;
        }
    }

    return <View>
        {replyToText}
        {ssoLoginWrapper}
        {topBar}
        {commentInputArea}
        {commentSubmitButton}
        {displayError}
        {commentReplyState.isReplySaving && <View style={styles.loadingView}>
            <ActivityIndicator size="large"/>
        </View>}
    </View>;
}

const styles = StyleSheet.create({
    replyingTo: {
        marginBottom: 5,
    },
    ssoLoginWrapper: {
        "display": "flex",
        "height": "fit-content",
        "minHeight": 140,
        "paddingTop": 30,
        "paddingRight": 0,
        "paddingBottom": 30,
        "paddingLeft": 0,
        "boxSizing": "border-box",
        "alignItems": "center",
        "justifyContent": "center",
        "borderWidth": 1,
        "borderColor": "#bfbfbf",
        "borderStyle": "solid",
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 11,
        "borderBottomRightRadius": 11,
        "borderBottomLeftRadius": 11
    },
    ssoLoginButton: {
        fontSize: 16,
        "animation": "pop-in 0.5s",
        "animationTimingFunction": "ease",
        "paddingTop": 10,
        "paddingRight": 17,
        "paddingBottom": 10,
        "paddingLeft": 27,
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 7,
        "borderBottomRightRadius": 7,
        "borderBottomLeftRadius": 7,
        "backgroundColor": "#333",
        "color": "#fff",
        "textDecorationLine": "none",
        "textDecorationColor": "black",
        "textDecorationStyle": "solid",
        "fontWeight": "500"
    },
    topBar: {
        "position": "relative",
        "minHeight": 25,
        "marginTop": 0,
        "marginRight": 26,
        "marginBottom": 15,
        "marginLeft": 26,
        "lineHeight": 25
    },
    loggedInInfo: {
        "width": "calc(100% - 60px)", // TODO
        "minWidth": 150
    },
    topBarAvatar: {
        "height": 25,
        "verticalAlign": "middle",
        "marginRight": 5,
        "borderTopLeftRadius": 25,
        "borderTopRightRadius": 25,
        "borderBottomRightRadius": 25,
        "borderBottomLeftRadius": 25,
        "overflow": "hidden"
        // TODO box shadow
    },
    topBarUsername: {
        "maxWidth": "calc(50% - 25px)", // TODO
        "overflow": "hidden",
        "verticalAlign": "middle",
        "textOverflow": "ellipsis",
        "fontWeight": "700",
        "whiteSpace": "nowrap"
    },
    topBarRight: {},
    commentInputArea: {},
    commentInputAreaReplySaving: {
        // animated-background
    },
    replyButtonWrapper: {
        flex: 1,
        alignItems: 'flex-end'
    },
    replyButton: {
        "paddingTop": 10,
        "paddingRight": 27,
        "paddingBottom": 10,
        "paddingLeft": 27,
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 7,
        "borderBottomRightRadius": 7,
        "borderBottomLeftRadius": 7,
        "backgroundColor": "#333",
        "color": "#fff"
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
    error: {
        "margin": 5,
        "color": "#ff0000"
    }
})
