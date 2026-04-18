import { View, Text, Image, Linking, ActivityIndicator, TextInput, useWindowDimensions, TouchableOpacity } from 'react-native';
import { FastCommentsImageAsset, ImageAssetConfig } from '../types';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { ModalMenu } from './modal-menu';
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { ThreeDot } from './three-dot';
import { NotificationBell } from './notification-bell';
import { CommentAreaMessage } from './comment-area-message';
import { CommentTextArea10Tap as CommentTextArea, FocusObserver, ValueObserver, EmoticonBarConfig } from './comment-text-area-10tap';
import { SaveCommentResponse } from '../types';
import { getActionTenantId, getActionURLID } from '../services/tenants';
import { newBroadcastId } from '../services/broadcast-id';
import { createURLQueryString, makeRequest } from '../services/http';
import { handleNewCustomConfig } from '../services/custom-config';
import { incOverallCommentCount } from '../services/comment-count';
import { setupUserPresenceState } from '../services/user-presense';
import { persistSubscriberState } from '../services/live';
import RenderHtml from 'react-native-render-html';
import { RNComment, IFastCommentsStyles, FastCommentsCallbacks } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

const SignUpErrorsTranslationIds: Record<string, string> = {
    'username-taken': 'USERNAME_TAKEN',
    'invalid-name': 'INVALID_USERNAME',
    'invalid-name-is-email': 'USERNAME_CANT_BE_EMAIL',
};

export interface ReplyAreaProps
    extends Pick<
        FastCommentsCallbacks,
        'onNotificationSelected' | 'onReplySuccess' | 'replyingTo' | 'onAuthenticationChange' | 'pickImage' | 'pickGIF'
    > {
    imageAssets: ImageAssetConfig;
    parentComment?: RNComment | null;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

interface CommentReplyState {
    username?: string;
    email?: string;
    websiteUrl?: string;
    comment?: string;
    isReplySaving: boolean;
    showSuccessMessage: boolean;
    showAuthInputForm: boolean;
    lastSaveResponse?: SaveCommentResponse;
}

async function logout(
    store: FastCommentsStore,
    callbacks: Pick<FastCommentsCallbacks, 'onAuthenticationChange'>
) {
    const state = store.getState();
    const sso = state.config.sso;
    if (sso) {
        if (sso.logoutURL) {
            await Linking.openURL(sso.logoutURL);
            return;
        } else if (sso.logoutCallback) {
            sso.logoutCallback('');
        }
    }
    await makeRequest({
        apiHost: state.apiHost,
        method: 'PUT',
        url: '/auth/logout',
    });
    const currentUser = state.currentUser;
    const currentUserId = currentUser && 'id' in currentUser ? currentUser.id : undefined;

    if (sso) {
        state.mergeConfig({
            sso: { ...sso, userDataJSONBase64: null as any, verificationHash: null as any },
        });
    }

    const latest = store.getState();
    const newSsoString = latest.config.allowAnon
        ? undefined
        : latest.config.sso
        ? JSON.stringify(latest.config.sso)
        : undefined;
    latest.setSSOConfigString(newSsoString);
    latest.setCurrentUser(null as any);
    persistSubscriberState(store, latest.urlIdWS!, latest.tenantIdWS!, null);
    callbacks?.onAuthenticationChange && callbacks.onAuthenticationChange('logout', currentUser, null);

    latest.setNotifications([]);
    latest.setNotificationsCount(0);
    latest.setNotificationsOpen(false);
    latest.setNotificationsLoading(false);
    latest.setNotificationsPaginationInProgress(false);
    latest.setNotificationsSubscribed(false);

    if (currentUserId) {
        const presence = { ...latest.userPresenceState };
        const onlineMap = { ...presence.usersOnlineMap };
        const idsMap = { ...presence.userIdsToCommentIds };
        delete onlineMap[currentUserId];
        delete idsMap[currentUserId];
        latest.replaceUsersOnlineMap(onlineMap);
        latest.setUserIdsToCommentIds(idsMap);
    }

    await setupUserPresenceState(store, latest.urlIdWS!);
}

async function submit(
    {
        store,
        parentComment,
        onReplySuccess,
        onAuthenticationChange,
    }: Pick<ReplyAreaProps, 'store' | 'parentComment' | 'onReplySuccess' | 'onAuthenticationChange'>,
    replyState: CommentReplyState,
    setReplyState: (patch: Partial<CommentReplyState>) => void
) {
    const state = store.getState();
    if (state.config.readonly) return;
    const replyingToId = parentComment?._id;

    let isAuthenticating = false;
    const allowAnon = state.config.allowAnon;

    const currentUserBeforeSubmit = state.currentUser;
    const lastCurrentUserId =
        currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;
    if (!currentUserBeforeSubmit && replyState.username) isAuthenticating = true;

    if (
        !replyState.comment ||
        (!allowAnon &&
            (!(replyState.username || (currentUserBeforeSubmit as any)?.username) ||
                (!allowAnon &&
                    !(
                        replyState.email ||
                        (currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit && (currentUserBeforeSubmit as any).email)
                    ))))
    ) {
        return;
    }

    const tenantIdToUse = getActionTenantId({ store, tenantId: parentComment?.tenantId });
    const urlIdToUse = getActionURLID({ store, urlId: parentComment?.urlId });

    const date = new Date();
    const newComment = {
        tenantId: tenantIdToUse,
        urlId: urlIdToUse,
        url: state.config.url,
        pageTitle: state.config.pageTitle,
        commenterName:
            currentUserBeforeSubmit && 'username' in currentUserBeforeSubmit
                ? (currentUserBeforeSubmit as any).username
                : replyState.username,
        commenterEmail:
            currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit
                ? (currentUserBeforeSubmit as any).email
                : replyState.email,
        commenterLink:
            currentUserBeforeSubmit && 'websiteUrl' in currentUserBeforeSubmit
                ? (currentUserBeforeSubmit as any).websiteUrl
                : replyState.websiteUrl,
        avatarSrc:
            currentUserBeforeSubmit && state.config.simpleSSO
                ? (currentUserBeforeSubmit as any).avatarSrc
                : undefined,
        comment: replyState.comment,
        parentId: replyingToId,
        date: date.valueOf(),
        localDateString: date.toString(),
        localDateHours: date.getHours(),
        productId: state.config.productId,
        meta: state.config.commentMeta,
        moderationGroupIds: state.config.moderationGroupIds,
        isFromMyAccountPage: state.config.tenantId === 'all',
    };
    const broadcastId = newBroadcastId();

    try {
        const response = await makeRequest<SaveCommentResponse>({
            apiHost: state.apiHost,
            method: 'POST',
            url: `/comments/${tenantIdToUse}/${createURLQueryString({
                urlId: urlIdToUse,
                sso: state.ssoConfigString,
                broadcastId,
                sessionId:
                    currentUserBeforeSubmit && 'sessionId' in currentUserBeforeSubmit
                        ? (currentUserBeforeSubmit as any).sessionId
                        : undefined,
            })}`,
            body: newComment,
        });

        let showSuccessMessage = false;
        if (response.customConfig) handleNewCustomConfig(store, response.customConfig);
        const comment = response.comment as RNComment;
        const wasSuccessful = response.status === 'success' && !!comment;
        const latest = store.getState();
        if (wasSuccessful) {
            comment.wasPostedCurrentSession = true;
            if (replyingToId) comment.repliesHidden = false;
            latest.upsertComment(comment, !!latest.config.newCommentsToBottom);
            incOverallCommentCount(latest.config.countAll, store, comment.parentId);

            if (response.user) {
                if (latest.config.simpleSSO) {
                    latest.setCurrentUser({ ...(latest.currentUser as any), ...response.user } as any);
                } else {
                    latest.setCurrentUser(response.user as any);
                }
                onAuthenticationChange &&
                    onAuthenticationChange('user-set', store.getState().currentUser, comment);
            }

            if (
                currentUserBeforeSubmit &&
                response.user &&
                'sessionId' in response.user &&
                (response.user as any).sessionId
            ) {
                latest.setCurrentUser({
                    ...(latest.currentUser as any),
                    sessionId: (response.user as any).sessionId,
                } as any);
                onAuthenticationChange &&
                    onAuthenticationChange('session-id-set', store.getState().currentUser, comment);
            }
            if (replyingToId === null && !latest.config.disableSuccessMessage) showSuccessMessage = true;
            const newCurrentUserId =
                currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;

            if (newCurrentUserId !== lastCurrentUserId || response.userIdWS !== latest.userIdWS) {
                // TODO: persistSubscriberState(store, urlIdWS, tenantIdWS, response.userIdWS);
            } else {
                void setupUserPresenceState(store, response.userIdWS!);
            }
        } else {
            if (isAuthenticating) {
                latest.setCurrentUser(null as any);
                onAuthenticationChange && onAuthenticationChange('authentication-failed', null, comment);
            }
            if (response.translations) {
                latest.mergeConfig({
                    translations: { ...(latest.config.translations ?? {}), ...response.translations },
                } as any);
            }
        }
        if (response.maxCharacterLength && response.maxCharacterLength !== latest.config.maxCommentCharacterLength) {
            latest.mergeConfig({ maxCommentCharacterLength: response.maxCharacterLength });
        }

        const patch: Partial<CommentReplyState> = {
            isReplySaving: false,
            showAuthInputForm: false,
            showSuccessMessage,
            lastSaveResponse: response,
        };
        if (wasSuccessful) {
            patch.username = undefined;
            patch.email = undefined;
            patch.websiteUrl = undefined;
            patch.comment = '';
        }
        setReplyState(patch);

        if (wasSuccessful) onReplySuccess && onReplySuccess(comment);
    } catch (response: any) {
        if (response && 'customConfig' in response && response.customConfig) {
            handleNewCustomConfig(store, response.customConfig);
        }
        if (isAuthenticating) {
            store.getState().setCurrentUser(null as any);
            onAuthenticationChange &&
                onAuthenticationChange('authentication-failed', null, newComment as unknown as RNComment);
        }
        setReplyState({
            isReplySaving: false,
            showAuthInputForm: false,
            showSuccessMessage: false,
            lastSaveResponse: response,
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
        store,
        styles,
        translations,
    } = props;

    const currentUser = useStoreValue(store, (s) => s.currentUser);
    const readonly = useStoreValue(store, (s) => !!s.config.readonly);
    const noNewRootComments = useStoreValue(store, (s) => !!s.config.noNewRootComments);
    const allowAnon = useStoreValue(store, (s) => !!s.config.allowAnon);
    const useSingleReplyField = useStoreValue(store, (s) => !!s.config.useSingleReplyField);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const disableEmailInputs = useStoreValue(store, (s) => !!s.config.disableEmailInputs);
    const enableCommenterLinks = useStoreValue(store, (s) => !!s.config.enableCommenterLinks);
    const ssoConfig = useStoreValue(store, (s) => s.config.sso || s.config.simpleSSO);
    const inlineReactImages = useStoreValue(store, (s) => s.config.inlineReactImages);

    const needsAuth = !currentUser && !!parentComment;
    const valueGetter: ValueObserver = {};
    const focusObserver: FocusObserver = {};

    const [commentReplyState, setCommentReplyStateRaw] = useState<CommentReplyState>({
        isReplySaving: false,
        showSuccessMessage: false,
        showAuthInputForm: needsAuth,
    });
    const setCommentReplyState = (patch: Partial<CommentReplyState>) =>
        setCommentReplyStateRaw((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
        if (parentComment) focusObserver.setFocused && focusObserver.setFocused(true);
    }, [parentComment]);

    useEffect(() => {
        if (!!parentComment && useSingleReplyField) {
            setCommentReplyState({ comment: `**@${parentComment.commenterName}** ` });
        }
    }, [parentComment, useSingleReplyField]);

    const { width } = useWindowDimensions();

    const getLatestInputValue = () => {
        const latestValue = valueGetter.getValue ? valueGetter.getValue() : '';
        setCommentReplyState({ comment: latestValue });
    };

    if (readonly || (!parentComment && noNewRootComments)) return null;

    const replyToText = parentComment ? (
        <RenderHtml
            source={{ html: translations.REPLYING_TO.replace('[to]', parentComment?.commenterName as string) }}
            contentWidth={width}
            baseStyle={styles.replyArea?.replyingToText}
        />
    ) : null;

    let ssoLoginWrapper = null;
    let topBar = null;
    let commentInputArea = null;
    let commentSubmitButton = null;
    let authFormArea = null;

    if (!currentUser && ssoConfig && !allowAnon) {
        if (ssoConfig.loginURL || ssoConfig.loginCallback) {
            ssoLoginWrapper = (
                <View style={styles.replyArea?.ssoLoginWrapper}>
                    <TouchableOpacity
                        style={styles.replyArea?.ssoLoginButton}
                        onPress={async () => {
                            if (ssoConfig.loginURL) await Linking.openURL(ssoConfig.loginURL);
                            else if (ssoConfig.loginCallback) ssoConfig.loginCallback('');
                        }}
                    >
                        <Image source={imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{ width: 22, height: 22 }} />
                        <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN}</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            ssoLoginWrapper = (
                <View style={styles.replyArea?.ssoLoginWrapper}>
                    <View style={styles.replyArea?.ssoLoginButton}>
                        <Image source={imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{ width: 22, height: 22 }} />
                        <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN_TO_COMMENT}</Text>
                    </View>
                </View>
            );
        }
    } else {
        if (!parentComment && currentUser) {
            topBar = (
                <View style={styles.replyArea?.topBar}>
                    <View style={styles.replyArea?.loggedInInfo}>
                        <View style={styles.replyArea?.topBarAvatarWrapper}>
                            <Image
                                style={styles.replyArea?.topBarAvatar}
                                source={
                                    (currentUser as any).avatarSrc
                                        ? { uri: (currentUser as any).avatarSrc }
                                        : getDefaultAvatarSrc(imageAssets)
                                }
                            />
                        </View>
                        <Text style={styles.replyArea?.topBarUsername}>{(currentUser as any).username}</Text>
                    </View>
                    <View style={styles.replyArea?.topBarRight}>
                        {(!ssoConfig || (ssoConfig && (ssoConfig.logoutURL || ssoConfig.logoutCallback))) && (
                            <ModalMenu
                                closeIcon={
                                    imageAssets[
                                        hasDarkBackground
                                            ? FastCommentsImageAsset.ICON_CROSS_WHITE
                                            : FastCommentsImageAsset.ICON_CROSS
                                    ]
                                }
                                styles={styles}
                                items={[
                                    {
                                        id: 'logout',
                                        label: translations.LOG_OUT,
                                        handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                                            await logout(store, { onAuthenticationChange });
                                            setModalId(null);
                                        },
                                    },
                                ]}
                                openButton={<ThreeDot styles={styles} />}
                            />
                        )}
                        <NotificationBell
                            imageAssets={imageAssets}
                            onNotificationSelected={onNotificationSelected}
                            store={store}
                            styles={styles}
                            translations={translations}
                        />
                    </View>
                </View>
            );
        }

        let commentInputAreaContent;
        if (commentReplyState.showSuccessMessage) {
            commentInputAreaContent = CommentAreaMessage({
                message: translations.COMMENT_HAS_BEEN_SUBMITTED,
                styles,
            });
        } else {
            const emoticonBarConfig: EmoticonBarConfig = {};
            if (inlineReactImages) {
                emoticonBarConfig.emoticons = inlineReactImages.map((src: string) => [
                    src,
                    <Image source={{ uri: src }} style={styles.commentTextAreaEmoticonBar?.icon} />,
                ]);
            }
            commentInputAreaContent = (
                <CommentTextArea
                    emoticonBarConfig={emoticonBarConfig}
                    styles={styles}
                    store={store}
                    value={commentReplyState.comment}
                    output={valueGetter}
                    focusObserver={focusObserver}
                    onFocus={() =>
                        needsAuth && !commentReplyState.showAuthInputForm && setCommentReplyState({ showAuthInputForm: true })
                    }
                    pickImage={pickImage}
                    pickGIF={pickGIF}
                />
            );
        }

        commentInputArea = (
            <View
                style={[
                    styles.replyArea?.commentInputArea,
                    commentReplyState.isReplySaving ? styles.replyArea?.commentInputAreaReplySaving : null,
                ]}
            >
                {commentInputAreaContent}
            </View>
        );

        const handleSubmit = async () => {
            getLatestInputValue();
            if (commentReplyState.showSuccessMessage && !parentComment) {
                setCommentReplyState({ showSuccessMessage: false });
            } else {
                setCommentReplyState({ isReplySaving: true });
                try {
                    await submit({ store, parentComment, onReplySuccess, onAuthenticationChange }, commentReplyState, setCommentReplyState);
                } catch (e) {
                    console.error('Failed to save a comment', e);
                }
                if (parentComment) parentComment.replyBoxOpen = false;
            }
        };

        if (!commentReplyState.isReplySaving) {
            commentSubmitButton = (
                <View style={styles.replyArea?.replyButtonWrapper}>
                    <TouchableOpacity style={styles.replyArea?.replyButton} onPress={handleSubmit}>
                        <Text style={styles.replyArea?.replyButtonText}>
                            {commentReplyState.showSuccessMessage ? translations.WRITE_ANOTHER_COMMENT : translations.SUBMIT_REPLY}
                        </Text>
                        <Image
                            source={
                                parentComment
                                    ? hasDarkBackground
                                        ? imageAssets[FastCommentsImageAsset.ICON_RETURN_WHITE]
                                        : imageAssets[FastCommentsImageAsset.ICON_RETURN]
                                    : hasDarkBackground
                                    ? imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]
                                    : imageAssets[FastCommentsImageAsset.ICON_BUBBLE]
                            }
                            style={styles.replyArea?.replyButtonIcon}
                        />
                    </TouchableOpacity>
                </View>
            );
        }

        const showAuth =
            commentReplyState.showAuthInputForm ||
            (commentReplyState.lastSaveResponse?.code &&
                SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.code!]);
        if (showAuth) {
            authFormArea = (
                <View style={styles.replyArea?.userInfoInput}>
                    {!disableEmailInputs && (
                        <Text style={styles.replyArea?.emailReasoning}>
                            {allowAnon ? translations.ENTER_EMAIL_TO_KEEP_COMMENT : translations.ENTER_EMAIL_TO_COMMENT}
                        </Text>
                    )}
                    {!disableEmailInputs && (
                        <TextInput
                            style={styles.replyArea?.authInput}
                            multiline={false}
                            maxLength={70}
                            placeholder={translations.EMAIL_FOR_VERIFICATION}
                            textContentType="emailAddress"
                            keyboardType="email-address"
                            autoComplete="email"
                            value={commentReplyState.email}
                            returnKeyType={enableCommenterLinks ? 'next' : 'send'}
                            onChangeText={(value) => setCommentReplyState({ email: value })}
                        />
                    )}
                    <TextInput
                        style={styles.replyArea?.authInput}
                        multiline={false}
                        maxLength={70}
                        placeholder={translations.PUBLICLY_DISPLAYED_USERNAME}
                        textContentType="username"
                        autoComplete="username"
                        value={commentReplyState.username}
                        returnKeyType={enableCommenterLinks ? 'next' : 'send'}
                        onChangeText={(value) => setCommentReplyState({ username: value })}
                    />
                    {enableCommenterLinks && (
                        <TextInput
                            style={styles.replyArea?.authInput}
                            maxLength={500}
                            placeholder={translations.ENTER_A_LINK}
                            onChangeText={(value) => setCommentReplyState({ websiteUrl: value })}
                        />
                    )}
                    {commentReplyState.lastSaveResponse?.code &&
                        SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.code!] && (
                            <Text style={styles.replyArea?.error}>
                                {translations[SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.code!]]}
                            </Text>
                        )}
                    {!disableEmailInputs && (
                        <Text style={styles.replyArea?.solicitationInfo}>{translations.NO_SOLICITATION_EMAILS}</Text>
                    )}
                </View>
            );
        }
    }

    let displayError = null;
    const lastSaveResponse = commentReplyState.lastSaveResponse;
    if (lastSaveResponse && lastSaveResponse.status !== 'success') {
        if (lastSaveResponse.code === 'banned') {
            let bannedText = translations.BANNED_COMMENTING;
            if (lastSaveResponse.bannedUntil) {
                bannedText +=
                    ' ' +
                    translations.BAN_ENDS.replace(
                        '[endsText]',
                        new Date(lastSaveResponse.bannedUntil).toLocaleString()
                    );
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
            displayError = (
                <Text style={styles.replyArea?.error}>
                    {translations.COMMENT_TOO_BIG.replace('[count]', lastSaveResponse.maxCharacterLength + '')}
                </Text>
            );
        } else if (lastSaveResponse.translatedError) {
            displayError = <Text style={styles.replyArea?.error}>lastSaveResponse.translatedError</Text>;
        } else if (lastSaveResponse.code) {
            const translatedError = translations[lastSaveResponse.code];
            displayError = <Text style={styles.replyArea?.error}>{translatedError}</Text>;
        } else {
            displayError = <Text style={styles.replyArea?.error}>{translations.ERROR_MESSAGE}</Text>;
        }
    }

    const topBarInputAreaAndSubmit = (
        <View style={styles.replyArea?.topBarAndInputArea}>
            {topBar}
            {commentInputArea}
            {authFormArea}
            {commentSubmitButton}
        </View>
    );

    return (
        <View>
            {replyToText && (
                <View style={styles.replyArea?.replyingTo}>
                    {replyToText}
                    {useSingleReplyField && (
                        <TouchableOpacity
                            onPress={() => {
                                replyingTo && replyingTo(null);
                                setCommentReplyState({ comment: '' });
                            }}
                        >
                            <Text style={styles.replyArea?.replyingToCancelText}>{translations.CANCEL}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            {ssoLoginWrapper}
            {displayError}
            {topBarInputAreaAndSubmit}
            {commentReplyState.isReplySaving && (
                <View style={styles.replyArea?.loadingView}>
                    <ActivityIndicator size="large" />
                </View>
            )}
        </View>
    );
}
