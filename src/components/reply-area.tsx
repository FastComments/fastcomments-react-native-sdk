import {FastCommentsState} from "../types";
import {View, Text, Image, Linking, ActivityIndicator, TextInput, useWindowDimensions, TouchableOpacity} from "react-native";
import {none, State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {FastCommentsImageAsset, ImageAssetConfig} from '../types';
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {ModalMenu} from "./modal-menu";
import {Dispatch, SetStateAction} from 'react';
import {ThreeDot} from "./three-dot";
import {NotificationBell} from "./notification-bell";
import {CommentAreaMessage} from "./comment-area-message";
import {CommentTextArea, FocusObserver, ValueObserver} from "./comment-text-area";
import {SaveCommentResponse} from "../types";
import {getActionTenantId, getActionURLID} from "../services/tenants";
import {newBroadcastId} from "../services/broadcast-id";
import {createURLQueryString, makeRequest} from "../services/http";
import {handleNewCustomConfig} from "../services/custom-config";
import {incOverallCommentCount} from "../services/comment-count";
import {addCommentToTree} from "../services/comment-trees";
import {setupUserPresenceState} from "../services/user-presense";
import {persistSubscriberState} from "../services/live";
import RenderHtml from 'react-native-render-html';
import {RNComment, IFastCommentsStyles, FastCommentsCallbacks} from "../types";
import {EmoticonBar, EmoticonBarConfig} from './wysiwyg/emoticon-bar';

// TODO replace with translatedError response which would reduce initial bundle size
const SignUpErrorsTranslationIds: Record<string, string> = {
    'username-taken': 'USERNAME_TAKEN',
    'invalid-name': 'INVALID_USERNAME',
    'invalid-name-is-email': 'USERNAME_CANT_BE_EMAIL'
};

export interface ReplyAreaProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected' | 'onReplySuccess' | 'replyingTo' | 'onAuthenticationChange' | 'pickImage' | 'pickGIF'> {
    imageAssets: ImageAssetConfig
    parentComment?: RNComment | null
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
    translations: Record<string, string>
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

async function logout(state: State<FastCommentsState>, callbacks: Pick<FastCommentsCallbacks, 'onAuthenticationChange'>) {
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
    callbacks?.onAuthenticationChange && callbacks.onAuthenticationChange('logout', currentUser, null);
    state.userNotificationState.set({
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

async function submit({
        state,
        parentComment,
        onReplySuccess,
        onAuthenticationChange,
    }: Pick<ReplyAreaProps, 'state' | 'parentComment' | 'onReplySuccess' | 'onAuthenticationChange'>,
    commentReplyState: State<CommentReplyState>
) {
    if (state.config.readonly.get()) {
        return;
    }
    const replyingToId = parentComment?._id;

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
        return;
    }
    // TODO validate email
    // if (!allowAnon && ... is email invalid ...) {
    //     return;
    // }

    const tenantIdToUse = getActionTenantId({state, tenantId: parentComment?.tenantId});
    const urlIdToUse = getActionURLID({state, urlId: parentComment?.urlId});

    const date = new Date();

    const newComment = {
        tenantId: tenantIdToUse,
        urlId: urlIdToUse,
        url: state.config.url.get(),
        pageTitle: state.config.pageTitle.get(),
        commenterName: currentUserBeforeSubmit ? currentUserBeforeSubmit.username : commentReplyState.username.get(),
        commenterEmail: currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit ? currentUserBeforeSubmit.email : commentReplyState.email.get(),
        commenterLink: currentUserBeforeSubmit && 'websiteUrl' in currentUserBeforeSubmit ? currentUserBeforeSubmit.websiteUrl : commentReplyState.websiteUrl.get(),
        avatarSrc: currentUserBeforeSubmit && state.config.simpleSSO.get() ? currentUserBeforeSubmit.avatarSrc : undefined,
        comment: commentReplyState.comment.get(),
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
        const comment = response.comment as RNComment;
        const wasSuccessful = response.status === 'success' && comment;
        if (wasSuccessful) {
            comment.wasPostedCurrentSession = true;
            state.commentCountOnClient.set((commentCountOnClient) => {
                commentCountOnClient++;
                return commentCountOnClient
            });
            state.commentsById[comment._id].set(comment);
            if (replyingToId) {
                comment.repliesHidden = false;
            }
            addCommentToTree(state.allComments, state.commentsTree, state.commentsById, comment, !!state.config.newCommentsToBottom.get());
            incOverallCommentCount(state.config.countAll.get(), state, comment.parentId);

            if (response.user) {
                if (state.config.simpleSSO.get()) { // for avatar, for example.
                    state.currentUser.merge(response.user);
                } else {
                    state.currentUser.set(response.user);
                }
                onAuthenticationChange && onAuthenticationChange('user-set', state.currentUser.get(), comment);
            }

            if (currentUserBeforeSubmit && response.user && 'sessionId' in response.user && response.user.sessionId) {
                state.currentUser.merge({
                    sessionId: response.user.sessionId
                });
                onAuthenticationChange && onAuthenticationChange('session-id-set', state.currentUser.get(), comment);
            }
            if (replyingToId === null && !state.config.disableSuccessMessage.get()) {
                showSuccessMessage = true;
            }
            const newCurrentUserId = currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;

            // reconnect to new websocket channel if needed
            if (newCurrentUserId !== lastCurrentUserId || response.userIdWS !== state.userIdWS.get()) {
                // TODO
                // persistSubscriberState(urlIdWS, tenantIdWS, response.userIdWS);
            } else {
                // noinspection ES6MissingAwait
                setupUserPresenceState(state, response.userIdWS!);
            }
        } else {
            if (isAuthenticating) {
                state.currentUser.set(null); // saved to authenticate - can't say we are logged in.
                onAuthenticationChange && onAuthenticationChange('authentication-failed', null, comment);
            }
            if (response.translations) {
                state.config.translations.merge(response.translations);
            }
        }
        if (response.maxCharacterLength && response.maxCharacterLength !== state.config.maxCommentCharacterLength.get()) {
            state.config.maxCommentCharacterLength.set(response.maxCharacterLength); // update UI
        }
        commentReplyState.set((commentReplyState) => {
            return {
                ...commentReplyState,
                isReplySaving: false,
                showAuthInputForm: false,
                showSuccessMessage,
                lastSaveResponse: response,

                // we only reset these on success.
                username: none,
                email: none,
                websiteUrl: none,
                comment: ''
            }
        });
        // important that this is after commentReplyState.set otherwise we will detatch the ReplyArea onReplySuccess() and then
        // we will do a state mutation on a destroyed state object, causing HOOKSTATE-106.
        if (wasSuccessful) {
            onReplySuccess && onReplySuccess(comment);
        }
    } catch (response: any) {
        if ('customConfig' in response && response.customConfig) {
            handleNewCustomConfig(state, response.customConfig);
        }
        if (isAuthenticating) {
            state.currentUser.set(null); // saved to authenticate - can't say we are logged in.
            onAuthenticationChange && onAuthenticationChange('authentication-failed', null, newComment as unknown as RNComment);
        }
        commentReplyState.set((commentReplyState) => {
            return {
                ...commentReplyState,
                isReplySaving: false,
                showAuthInputForm: false,
                showSuccessMessage: false,
                lastSaveResponse: response
            }
        });
    }
}

export function ReplyArea(props: ReplyAreaProps) {
    const {
        imageAssets,
        onNotificationSelected,
        onAuthenticationChange,
        onReplySuccess,
        parentComment,
        pickGIF,
        pickImage,
        replyingTo,
        styles,
        translations,
    } = props;
    const state = useHookstate(props.state); // create scoped state
    const currentUser = state.currentUser?.get();

    const needsAuth = !currentUser && !!parentComment;
    const valueGetter: ValueObserver = {};
    const focusObserver: FocusObserver = {};

    useHookstateEffect(() => {
        if (parentComment) {
            focusObserver.setFocused && focusObserver.setFocused(true);
        }
    }, [parentComment])

    const commentReplyState = useHookstate<CommentReplyState>({
        isReplySaving: false,
        showSuccessMessage: false,
        // for root comment area, we don't show the auth input form until they interact to save screen space.
        showAuthInputForm: needsAuth,
    });
    if (!!parentComment && state.config.useSingleReplyField.get()) {
        commentReplyState.comment.set(`**@${parentComment.commenterName}** `);
    }
    const {width} = useWindowDimensions();

    const getLatestInputValue = () => {
        const latestValue = valueGetter.getValue ? valueGetter.getValue() : '';
        commentReplyState.comment.set(latestValue);
    }

    // parentId check is so that we don't allow new comments to root, but we do allow new comments **inline**
    if (state.config.readonly.get() || (!parentComment && state.config.noNewRootComments.get())) {
        return null;
    }

    // TODO OPTIMIZE BENCHMARK: faster solution than using RenderHtml. RenderHtml is easy because the translation is HTML, but it only has <b></b> elements.
    //  We can't hardcode the order of the bold elements due to localization, so rendering HTML is nice. But we can probably transform this into native elements faster than RenderHtml.
    const replyToText = parentComment
        // we intentionally don't use the REPLYING_TO_AS translation like web to save horizontal space for the cancel button
        ? <RenderHtml source={{
            html: translations.REPLYING_TO.replace('[to]', parentComment?.commenterName as string)
        }} contentWidth={width} baseStyle={styles.replyArea?.replyingToText}/> : null;

    const ssoConfig = state.config.sso?.get() || state.config.simpleSSO?.get();
    let ssoLoginWrapper;
    let reactsBar;
    let topBar;
    let commentInputArea;
    let commentSubmitButton;
    let authFormArea;

    if (!currentUser && ssoConfig && !state.config.allowAnon.get()) {
        if (ssoConfig.loginURL || ssoConfig.loginCallback) { // if they don't define a URL, we just show a message.
            ssoLoginWrapper = <View style={styles.replyArea?.ssoLoginWrapper}>
                <TouchableOpacity style={styles.replyArea?.ssoLoginButton} onPress={async () => {
                    if (ssoConfig.loginURL) {
                        await Linking.openURL(ssoConfig.loginURL);
                    } else if (ssoConfig?.loginCallback) {
                        ssoConfig.loginCallback(''); // we do not need instance id in react widget
                    }
                }
                }>
                    <Image source={imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{width: 22, height: 22}}/>
                    <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN}</Text>
                </TouchableOpacity>
            </View>;
        } else {
            ssoLoginWrapper = <View style={styles.replyArea?.ssoLoginWrapper}>
                <View style={styles.replyArea?.ssoLoginButton}>
                    <Image source={imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{width: 22, height: 22}}/>
                    <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN_TO_COMMENT}</Text>
                </View>
            </View>;
        }
    } else {
        if (!parentComment && currentUser) {
            topBar = <View style={styles.replyArea?.topBar}>
                <View style={styles.replyArea?.loggedInInfo}>
                    <Image style={styles.replyArea?.topBarAvatar}
                           source={currentUser.avatarSrc ? {uri: currentUser.avatarSrc} : getDefaultAvatarSrc(imageAssets)}/>
                    <Text style={styles.replyArea?.topBarUsername}>{currentUser.username}</Text>
                </View>
                <View style={styles.replyArea?.topBarRight}>
                    {(!ssoConfig || (ssoConfig && (ssoConfig.logoutURL || ssoConfig.logoutCallback)))
                    && <ModalMenu
                        closeIcon={imageAssets[state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                        styles={styles} items={[
                        {
                            id: 'logout',
                            label: translations.LOG_OUT,
                            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                                await logout(state, {onAuthenticationChange});
                                setModalId(null)
                            }
                        }
                    ]} openButton={<ThreeDot styles={styles}/>}/>
                    }
                    <NotificationBell
                        imageAssets={imageAssets}
                        onNotificationSelected={onNotificationSelected}
                        state={state}
                        styles={styles}
                        translations={translations}
                    />
                </View>
            </View>;
        }

        let commentInputAreaContent;
        if (commentReplyState.showSuccessMessage.get()) {
            commentInputAreaContent = CommentAreaMessage({message: translations.COMMENT_HAS_BEEN_SUBMITTED, styles});
        } else {
            const inlineReactImages = state.config.inlineReactImages.get();
            let emoticonBarConfig: EmoticonBarConfig = {};
            if (inlineReactImages) {
                emoticonBarConfig.emoticons = inlineReactImages.map(function (src) {
                    return [src, <Image source={{uri: src}} style={styles.commentTextAreaEmoticonBar?.icon}/>]
                })
                reactsBar = <EmoticonBar config={emoticonBarConfig} styles={styles.commentTextAreaEmoticonBar}/>
            }
            commentInputAreaContent =
                <CommentTextArea
                    emoticonBarConfig={emoticonBarConfig}
                    styles={styles}
                    state={state.get()}
                    value={commentReplyState.comment.get()}
                    output={valueGetter}
                    focusObserver={focusObserver}
                    onFocus={() => needsAuth && !commentReplyState.showAuthInputForm.get() && commentReplyState.showAuthInputForm.set(true)}
                    pickImage={pickImage}
                    pickGIF={pickGIF}
                />;
        }

        commentInputArea = <View
            style={[styles.replyArea?.commentInputArea, (commentReplyState.isReplySaving.get() ? styles.replyArea?.commentInputAreaReplySaving : null)]}>
            {commentInputAreaContent}
        </View>;

        const handleSubmit = async () => {
            getLatestInputValue();
            if (commentReplyState.showSuccessMessage.get() && !parentComment) {
                commentReplyState.showSuccessMessage.set(false); // hide success message in this case
            } else {
                commentReplyState.isReplySaving.set(true);
                try {
                    // note! This will modify commentReplyState and call onReplySuccess in the desired/required order.
                    await submit({state, parentComment, onReplySuccess}, commentReplyState);
                } catch (e) {
                    console.error('Failed to save a comment', e);
                }
                if (parentComment && parentComment) {
                    parentComment.replyBoxOpen = false;
                }
            }
        }

        if (!commentReplyState.isReplySaving.get()) {
            commentSubmitButton = <View style={styles.replyArea?.replyButtonWrapper}>
                <TouchableOpacity style={styles.replyArea?.replyButton} onPress={handleSubmit}>
                    <Text
                        style={styles.replyArea?.replyButtonText}>{
                        commentReplyState.showSuccessMessage.get()
                            ? translations.WRITE_ANOTHER_COMMENT
                            : translations.SUBMIT_REPLY
                    }</Text>
                    <Image
                        source={parentComment
                            ? (state.config.hasDarkBackground.get()
                                ? imageAssets[FastCommentsImageAsset.ICON_RETURN_WHITE]
                                : imageAssets[FastCommentsImageAsset.ICON_RETURN])
                            : (state.config.hasDarkBackground.get()
                                ? imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]
                                : imageAssets[FastCommentsImageAsset.ICON_BUBBLE])}
                        style={styles.replyArea?.replyButtonIcon}/>
                </TouchableOpacity>
            </View>;
        }

        if (commentReplyState.showAuthInputForm.get() || (commentReplyState.lastSaveResponse.get()?.code && SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.get()!.code!])) { // checking for just true here causes the user to appear to logout on any failure, which is weird.
            authFormArea = <View style={styles.replyArea?.userInfoInput}>
                {!state.config.disableEmailInputs.get &&
                <Text
                    style={styles.replyArea?.emailReasoning}>
                    {state.config.allowAnon.get() ? translations.ENTER_EMAIL_TO_KEEP_COMMENT : translations.ENTER_EMAIL_TO_COMMENT}
                </Text>}
                {!state.config.disableEmailInputs.get() &&
                <TextInput
                    style={styles.replyArea?.authInput}
                    multiline={false}
                    maxLength={70}
                    placeholder={translations.EMAIL_FOR_VERIFICATION}
                    autoComplete='email'
                    value={commentReplyState.email.get()}
                    returnKeyType={state.config.enableCommenterLinks.get() ? 'next' : 'send'}
                    onChangeText={(value) => commentReplyState.email.set(value)}/>}
                <TextInput
                    style={styles.replyArea?.authInput}
                    multiline={false}
                    maxLength={70}
                    placeholder={translations.PUBLICLY_DISPLAYED_USERNAME}
                    autoComplete={'username'}
                    value={commentReplyState.username.get()}
                    returnKeyType={state.config.enableCommenterLinks.get() ? 'next' : 'send'}
                    onChangeText={(value) => commentReplyState.username.set(value)}/>
                {state.config.enableCommenterLinks.get() &&
                <TextInput
                    style={styles.replyArea?.authInput}
                    maxLength={500}
                    placeholder={translations.ENTER_A_LINK}
                    onChangeText={(value) => commentReplyState.websiteUrl.set(value)}/>
                }
                {commentReplyState.lastSaveResponse.get()?.code && SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.get()!.code!] &&
                <Text
                    style={styles.replyArea?.error}>{translations[SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.get()!.code!]]}</Text>
                }
                {!state.config.disableEmailInputs &&
                <Text style={styles.replyArea?.solicitationInfo}>{translations.NO_SOLICITATION_EMAILS}</Text>
                }
            </View>;
        }

        // We don't allow cancelling when replying to top-level comments.
        // This is currently disabled because the reply box open state is now completely manged in CommentBottom as an optimization.
        // if (parentComment) {
        //     replyCancelButton = <View style={styles.replyArea?.replyCancelButtonWrapper}>
        //         <TouchableOpacity style={styles.replyArea?.replyCancelButton} onPress={() => parentComment.replyBoxOpen.set(false)}>
        //             <Image source={imageAssets[FastCommentsImageAsset.ICON_CROSS]}
        //                    style={{width: 9, height: 9}}/>
        //         </TouchableOpacity>
        //     </View>
        // }
    }

    let displayError;

    const lastSaveResponse = commentReplyState.lastSaveResponse.get();
    if (lastSaveResponse && lastSaveResponse.status !== 'success') {
        if (lastSaveResponse.code === 'banned') {
            let bannedText = translations.BANNED_COMMENTING;
            if (lastSaveResponse.bannedUntil) {
                bannedText += ' ' + translations.BAN_ENDS.replace('[endsText]', new Date(lastSaveResponse.bannedUntil).toLocaleString());
            }
            displayError = <Text style={styles.replyArea?.error}>{bannedText}</Text>;
        } else if (lastSaveResponse.code === 'user-rate-limited') {
            displayError = <Text style={styles.replyArea?.error}>{translations.COMMENTING_TOO_QUICKLY}</Text>;
        } else if (lastSaveResponse.code === 'rate-limited') {
            displayError = <Text style={styles.replyArea?.error}>{translations.RATE_LIMITED}</Text>;
        } else if (lastSaveResponse.code === 'profile-comments-private') {
            displayError = <Text style={styles.replyArea?.error}>{translations.PROFILE_COMMENTS_PRIVATE}</Text>;
        } else if (lastSaveResponse.code === 'profile-dm-private') {
            displayError = <Text style={styles.replyArea?.error}>{translations.PROFILE_DM_PRIVATE}</Text>;
        } else if (lastSaveResponse.code === 'comment-too-big') {
            displayError =
                <Text
                    style={styles.replyArea?.error}>{translations.COMMENT_TOO_BIG.replace('[count]', lastSaveResponse.maxCharacterLength + '')}</Text>;
        } else if (lastSaveResponse.translatedError) {
            displayError = <Text style={styles.replyArea?.error}>lastSaveResponse.translatedError</Text>;
        } else if (lastSaveResponse.code) {
            // TODO this case should probably be deprecated and replaced by the server sending translatedError
            const translatedError = translations[lastSaveResponse.code];
            displayError = <Text style={styles.replyArea?.error}>{translatedError}</Text>;
        } else {
            // generic error
            displayError = <Text style={styles.replyArea?.error}>{state.translations.ERROR_MESSAGE.get()}</Text>;
        }
    }

    // Sometimes you want to put this all on one line, so having it in one container is helpful. erebus-dark theme uses this.
    const topBarInputAreaAndSubmit = <View style={styles.replyArea?.topBarAndInputArea}>
        {topBar}
        {commentInputArea}
        {authFormArea}
        {commentSubmitButton}
    </View>;

    return <View>
        {replyToText && <View style={styles.replyArea?.replyingTo}>
            {replyToText}
            {state.config.useSingleReplyField.get()
            && <TouchableOpacity onPress={() => {
                // TODO CONFIRM
                replyingTo && replyingTo(null);
                commentReplyState.comment.set('');
            }}>
                <Text style={styles.replyArea?.replyingToCancelText}>{state.translations.CANCEL.get()}</Text>
            </TouchableOpacity>
            }
        </View>}
        {ssoLoginWrapper}
        {displayError}
        {reactsBar}
        {topBarInputAreaAndSubmit}
        {commentReplyState.isReplySaving.get() && <View style={styles.replyArea?.loadingView}>
            <ActivityIndicator size="large"/>
        </View>}
    </View>;
}
