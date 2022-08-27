// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View, Text, StyleSheet, Pressable, Image, Linking, ActivityIndicator, TextInput, useWindowDimensions} from "react-native";
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
import {persistSubscriberState} from "../services/live";
import RenderHtml from 'react-native-render-html';

// TODO replace with translatedError response which would reduce initial bundle size
const SignUpErrorsTranslationIds: Record<string, string> = {
    'username-taken': 'USERNAME_TAKEN',
    'invalid-name': 'INVALID_USERNAME',
    'invalid-name-is-email': 'USERNAME_CANT_BE_EMAIL'
};

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
    showAuthInputForm: boolean
    lastSaveResponse?: SaveCommentResponse
}

async function logout(state: State<FastCommentsState>) {
    if (state.config.sso.get()) {
        if (state.config.sso.get()!.logoutURL) {
            await Linking.openURL(state.config.sso.get()!.logoutURL!);
            return;
        } else if (state.config.sso.get()!.logoutCallback) {
            state.config.sso.get()!.logoutCallback!('');
        }
    }
    await makeRequest({
        apiHost: state.apiHost.get()!,
        method: 'PUT',
        url: '/auth/logout'
    });
    const currentUser = state.currentUser.get();
    let currentUserId = currentUser && 'id' in currentUser && currentUser.id;

    // reset SSO config to log out the user.
    if (state.config.sso.get()) {
        state.config.sso.set((sso) => {
            if (sso) {
                sso.userDataJSONBase64 = null;
                sso.verificationHash = null;
            }
            return sso;
        });
    }
    // update the cached sso state passed in all api calls
    // if we allow anon, just turn off SSO in API calls - since we will just use anon commenting until widget is reloaded with SSO config again.
    state.ssoConfigString.set(state.config.allowAnon.get() ? undefined : (state.config.sso.get() ? JSON.stringify(state.config.sso.get()!) : undefined));
    // reset the currently logged in user
    state.currentUser.set(null);
    persistSubscriberState(state, state.urlIdWS.get()!, state.tenantIdWS.get()!, null); // reconnect w/o a user
    // TODO
    //     onAuthenticationChange(config.instanceId, 'logout', currentUser);
    state.userNotificationState.set({ // TODO put default somewhere since also defined in fastcomments-state
        isOpen: false,
        isLoading: false,
        count: 0,
        notifications: [],
        isPaginationInProgress: false,
        isSubscribed: false,
    });
    state.userPresenceState.set((userPresenceState) => {
        if (currentUserId) {
            delete userPresenceState.usersOnlineMap[currentUserId];
            delete userPresenceState.userIdsToCommentIds[currentUserId];
        }
        return userPresenceState;
    });
    await setupUserPresenceState(state, state.urlIdWS.get()!);
}

// TODO why is default webstorm formatting terrible? fix
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

    const currentUserBeforeSubmit = state.currentUser.get();
    const lastCurrentUserId = currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;
    if (!currentUserBeforeSubmit && commentReplyState.username) {
        isAuthenticating = true;
    }

    if (!commentReplyState.comment ||
        (!allowAnon && (
                !(commentReplyState.username
                    || currentUserBeforeSubmit?.username)
                || (!allowAnon && !(commentReplyState.email
                        || (currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit && currentUserBeforeSubmit.email))
                )
            )
        )) {
        return commentReplyState;
    }
    // TODO validate email
    // if (!allowAnon && ... is email invalid ...) {
    //     return;
    // }

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

    console.log('saving comment', newComment) // TODO remove

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
            addCommentToTree(state.allComments, state.commentsTree, state.commentsById, response.comment, !!state.config.newCommentsToBottom.get());
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
            showAuthInputForm: false,
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
            showAuthInputForm: false,
            showSuccessMessage: false,
            lastSaveResponse: response
        };
    }
}

export function ReplyArea({state, parentComment}: ReplyAreaState) {
    const currentUser = state.currentUser?.get();
    const needsAuth = !currentUser && !!parentComment;
    const [commentReplyState, setNewCommentState] = useState<CommentReplyState>({
        isReplySaving: false,
        showSuccessMessage: false,
        // for root comment area, we don't show the auth input form until they interact to save screen space.
        showAuthInputForm: needsAuth
    });
    const {width} = useWindowDimensions();
    const lastSaveResponse = commentReplyState.lastSaveResponse;

    // parentId check is so that we don't allow new comments to root, but we do allow new comments **inline**
    if (state.config.readonly.get() || (!parentComment && state.config.noNewRootComments.get())) {
        return null;
    }

    // TODO OPTIMIZE BENCHMARK: faster solution than using RenderHtml. RenderHtml is easy because the translation is HTML, but it only has <b></b> elements.
    //  We can't hardcode the order of the bold elements due to localization, so rendering HTML is nice. But we can probably transform this into native elements faster than RenderHtml.
    const replyToText = parentComment
        ? (
            currentUser
                ? <RenderHtml source={{
                    html:
                        state
                            .translations.REPLYING_TO_AS.get().replace('[to]', parentComment.commenterName.get() as string).replace('[from]', currentUser.username)
                }} contentWidth={width}/>
                : <RenderHtml source={{
                    html:
                        state.translations.REPLYING_TO.get().replace('[to]', parentComment.commenterName.get() as string)
                }} contentWidth={width}/>
        ) : null;

    const ssoConfig = state.config.sso?.get() || state.config.simpleSSO?.get();
    let ssoLoginWrapper;
    let topBar;
    let commentInputArea;
    let commentSubmitButton;
    let authFormArea;
    let replyCancelButton;

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
                    ]} openButton={<ThreeDot style={{paddingTop: 5, paddingBottom: 5, marginRight: 5}}/>}/>
                    }
                    <NotificationBell state={state}/>
                </View>
            </View>;
        }

        let commentInputAreaContent;
        if (commentReplyState.showSuccessMessage) {
            commentInputAreaContent = CommentAreaMessage(state.translations.COMMENT_HAS_BEEN_SUBMITTED.get());
        } else {
            commentInputAreaContent =
                <CommentTextArea
                    state={state}
                    value={commentReplyState.comment}
                    onChangeText={(newValue: string) => setNewCommentState({...commentReplyState, comment: newValue})}
                    onFocus={() => needsAuth && !commentReplyState.showAuthInputForm && setNewCommentState({
                        ...commentReplyState,
                        showAuthInputForm: true
                    })}
                />;
        }

        commentInputArea = <View style={[styles.commentInputArea, (commentReplyState.isReplySaving ? styles.commentInputAreaReplySaving : null)]}>
            {commentInputAreaContent}
        </View>;

        const handleSubmit = async () => {
            if (commentReplyState.showSuccessMessage && !parentComment) {
                setNewCommentState((commentReplyState) => {
                    return {
                        ...commentReplyState,
                        showSuccessMessage: false
                    };
                });
                // TODO focus on text area
            } else {
                setNewCommentState((commentReplyState) => {
                    return {
                        ...commentReplyState,
                        isReplySaving: true
                    };
                });
                try {
                    const submitResponse = await submit({state, parentComment}, commentReplyState);
                    setNewCommentState({
                        username: undefined,
                        email: undefined,
                        websiteUrl: undefined,
                        comment: undefined,
                        isReplySaving: false,
                        showAuthInputForm: submitResponse.showAuthInputForm,
                        showSuccessMessage: submitResponse.showSuccessMessage,
                        lastSaveResponse: submitResponse.lastSaveResponse
                    });
                } catch (e) {
                    console.error('Failed to save a comment', e);
                }
                setNewCommentState((commentReplyState) => {
                    return {
                        ...commentReplyState,
                        isReplySaving: false
                    };
                });
                if (parentComment?.get()) {
                    state.commentState[parentComment._id.get()].replyBoxOpen.set(false);
                }
            }
        }

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
                <Pressable style={styles.replyButton} onPress={handleSubmit}>
                    <Text
                        style={styles.replyButtonText}>{commentReplyState.showSuccessMessage ? state.translations.WRITE_ANOTHER_COMMENT.get() : state.translations.SUBMIT_REPLY.get()}</Text>
                    <Image
                        source={parentComment ? state.imageAssets[FastCommentsImageAsset.ICON_RETURN].get() : state.imageAssets[FastCommentsImageAsset.ICON_BUBBLE].get()}
                        style={styles.replyButtonIcon}/>
                </Pressable>
            </View>;
        }

        if (commentReplyState.showAuthInputForm || (lastSaveResponse?.code && SignUpErrorsTranslationIds[lastSaveResponse.code])) { // checking for just true here causes the user to appear to logout on any failure, which is weird.
            console.log('showing auth input area', commentReplyState.showAuthInputForm, lastSaveResponse?.code);
            authFormArea = <View style={styles.userInfoInput}>
                {!state.config.disableEmailInputs.get &&
                <Text
                    style={styles.emailReasoning}>
                    {state.config.allowAnon.get() ? state.translations.ENTER_EMAIL_TO_KEEP_COMMENT.get() : state.translations.ENTER_EMAIL_TO_COMMENT.get()}
                </Text>}
                {!state.config.disableEmailInputs.get() &&
                <TextInput
                    style={styles.authInput}
                    multiline={false}
                    maxLength={70}
                    placeholder={state.translations.EMAIL_FOR_VERIFICATION.get()}
                    autoComplete='email'
                    value={commentReplyState.email}
                    returnKeyType={state.config.enableCommenterLinks.get() ? 'next' : 'send'}
                    onChangeText={(value) => setNewCommentState({...commentReplyState, email: value})}/>}
                <TextInput
                    style={styles.authInput}
                    multiline={false}
                    maxLength={70}
                    placeholder={state.translations.PUBLICLY_DISPLAYED_USERNAME.get()}
                    autoComplete={'username'}
                    value={commentReplyState.username}
                    returnKeyType={state.config.enableCommenterLinks.get() ? 'next' : 'send'}
                    onChangeText={(value) => setNewCommentState({...commentReplyState, username: value})}/>
                {state.config.enableCommenterLinks.get() &&
                <TextInput
                    maxLength={500}
                    placeholder={state.translations.ENTER_A_LINK.get()}
                    onChangeText={(value) => setNewCommentState({...commentReplyState, websiteUrl: value})}/>
                }
                {lastSaveResponse?.code && SignUpErrorsTranslationIds[lastSaveResponse.code] &&
                <Text style={styles.error}>{state.translations[SignUpErrorsTranslationIds[lastSaveResponse.code]].get()}</Text>
                }
                {!state.config.disableEmailInputs &&
                <Text style={styles.solicitationInfo}>{state.translations.NO_SOLICITATION_EMAILS.get()}</Text>
                }
            </View>;
        }

        // We don't allow cancelling when replying to top-level comments.
        if (parentComment) {
            replyCancelButton = <View style={styles.replyCancelButtonWrapper}>
                <Pressable style={styles.replyCancelButton} onPress={() => state.commentState[parentComment._id.get()].replyBoxOpen.set(false)}>
                    <Image source={state.imageAssets[FastCommentsImageAsset.ICON_CROSS].get()}
                           style={{width: 9, height: 9}}/>
                </Pressable>
            </View>
        }
    }

    let displayError;

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
        {replyToText && <View style={styles.replyingTo}>{replyToText}</View>}
        {ssoLoginWrapper}
        {topBar}
        {commentInputArea}
        {displayError}
        {authFormArea}
        {commentSubmitButton}
        {replyCancelButton}
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
        flex: 1,
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        "minHeight": 25,
        "marginTop": 0,
        "marginRight": 26,
        "marginBottom": 15,
        "marginLeft": 26,
        "lineHeight": 25
    },
    loggedInInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        // "width": "calc(100% - 60px)", // TODO
        "minWidth": 150
    },
    topBarAvatar: {
        "height": 25,
        "width": 25,
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
        // "maxWidth": "calc(50% - 25px)", // TODO
        "overflow": "hidden",
        "verticalAlign": "middle",
        "textOverflow": "ellipsis",
        "fontWeight": "700",
        "whiteSpace": "nowrap"
    },
    topBarRight: {
        width: 100,
        alignItems: 'center',
        alignContent: 'center',
        justifyContent: 'center',
        justifyItems: 'center',
        flexDirection: 'row',
    },
    commentInputArea: {},
    commentInputAreaReplySaving: {
        // animated-background
    },
    replyButtonWrapper: {
        alignItems: 'flex-end',
        justifyContent: 'space-between'
    },
    replyButton: { // TODO common button colors
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 10,
        marginRight: 10,
        "paddingTop": 10,
        "paddingRight": 20,
        "paddingBottom": 10,
        "paddingLeft": 20,
        borderWidth: 1,
        borderRadius: 7,
        borderColor: "#a2a2a2",
        "backgroundColor": "#fbfbfb"
    },
    replyButtonText: {
        "color": "#333"
    },
    replyButtonIcon: {
        width: 22,
        height: 22,
        marginLeft: 10,
        aspectRatio: 1,
        resizeMode: 'stretch'
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
    },
    userInfoInput: {
        "marginTop": 10,
        "marginRight": 0,
        "marginBottom": 10,
        "marginLeft": 0,
        "fontSize": 13
    },
    emailReasoning: {
        fontWeight: '600'
    },
    authInput: {
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
    solicitationInfo: {
        "marginTop": 10
    },
    authInputSubmit: {
        "paddingTop": 10,
        "paddingRight": 27,
        "paddingBottom": 10,
        "paddingLeft": 27,
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 7,
        "borderBottomRightRadius": 7,
        "borderBottomLeftRadius": 7,
        "backgroundColor": "#333"
    },
    replyCancelButtonWrapper: {
        position: 'absolute',
        top: 0,
        right: 0
    },
    replyCancelButton: {
        "paddingTop": 10,
        "paddingRight": 10,
        "paddingBottom": 10,
        "paddingLeft": 10,
        "borderWidth": 1,
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 4,
        "borderBottomRightRadius": 4,
        "borderBottomLeftRadius": 4,
        "borderColor": "#a2a2a2",
        "backgroundColor": "#fbfbfb"
    }
});
