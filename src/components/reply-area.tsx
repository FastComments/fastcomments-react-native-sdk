import { View, Text, Image, Linking, TextInput, useWindowDimensions, TouchableOpacity } from 'react-native';
import { FastCommentsImageAsset, ImageAssetConfig } from '../types';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { ModalMenu } from './modal-menu';
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import { ThreeDot } from './three-dot';
import { NotificationBell } from './notification-bell';
import { CommentAreaMessage } from './comment-area-message';
import { CommentTextArea, FocusObserver, ValueObserver, EmoticonBarConfig } from './comment-text-area';
import { SavingShimmer } from './saving-shimmer';
import type { CommentData, CreateCommentPublic200Response, PublicComment } from 'fastcomments-sdk';
import { getActionTenantId, getActionURLID } from '../services/tenants';
import { newBroadcastId } from '../services/broadcast-id';
import { handleNewCustomConfig } from '../services/custom-config';
import { editorHtmlToServerHtml, isEditorHtmlEffectivelyEmpty } from '../services/editor/editor-html-to-server-html';
import { isIdentifiedUser } from '../services/user-auth-state';
import { incOverallCommentCount } from '../services/comment-count';
import { setupUserPresenceState } from '../services/user-presense';
import { persistSubscriberState } from '../services/live';
import RenderHtml from 'react-native-render-html';
import { RNComment, IFastCommentsStyles, FastCommentsCallbacks } from '../types';
import type { FastCommentsSessionUser } from '../types/user';
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
    lastSaveResponse?: CreateCommentPublic200Response;
    /** Set when the comment exceeds the tenant's character limit. **/
    tooLongLimit?: number;
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
    const sdk = state.sdk;
    await sdk.publicApi.logoutPublic();
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

function publicCommentToRNComment(
    comment: PublicComment,
    tenantId: string,
    urlId: string
): RNComment {
    const dateString = comment.date instanceof Date ? comment.date.toISOString() : '';
    return {
        _id: comment.id,
        tenantId,
        urlId,
        commentHTML: comment.commentHTML,
        commenterName: comment.commenterName,
        commenterLink: comment.commenterLink ?? undefined,
        userId: comment.userId ?? undefined,
        anonUserId: comment.anonUserId ?? undefined,
        avatarSrc: comment.avatarSrc ?? undefined,
        parentId: comment.parentId ?? undefined,
        date: dateString,
        verified: comment.verified,
        votes: comment.votes ?? undefined,
        votesUp: comment.votesUp ?? undefined,
        votesDown: comment.votesDown ?? undefined,
        hasImages: comment.hasImages,
        isByAdmin: comment.isByAdmin,
        isByModerator: comment.isByModerator,
        isPinned: comment.isPinned ?? undefined,
        isLocked: comment.isLocked ?? undefined,
        displayLabel: comment.displayLabel ?? undefined,
        isDeleted: comment.isDeleted,
        isSpam: comment.isSpam,
        isFlagged: comment.isFlagged,
        isBlocked: comment.isBlocked,
        isVotedDown: comment.isVotedDown,
        isVotedUp: comment.isVotedUp,
        isUnread: comment.isUnread,
        myVoteId: comment.myVoteId,
        approved: comment.approved,
        editKey: comment.editKey,
        requiresVerification: comment.requiresVerification,
        nestedChildrenCount: comment.nestedChildrenCount ?? undefined,
    };
}

async function submit(
    {
        store,
        parentComment,
        onReplySuccess,
        onAuthenticationChange,
        clearEditor,
    }: Pick<ReplyAreaProps, 'store' | 'parentComment' | 'onReplySuccess' | 'onAuthenticationChange'> & {
        clearEditor?: () => void;
    },
    replyState: CommentReplyState,
    setReplyState: (patch: Partial<CommentReplyState>) => void
) {
    const state = store.getState();
    if (state.config.readonly) return;
    const replyingToId = parentComment?._id;

    // The server hard-truncates beyond the limit; reject loudly instead of
    // silently losing the tail of the comment.
    const serverCommentHtml = editorHtmlToServerHtml(replyState.comment ?? '');
    const maxCommentLength = state.config.maxCommentCharacterLength || 2000;
    if (serverCommentHtml.length > maxCommentLength) {
        setReplyState({ isReplySaving: false, tooLongLimit: maxCommentLength });
        return;
    }

    let isAuthenticating = false;
    const allowAnon = state.config.allowAnon;

    const currentUserBeforeSubmit = state.currentUser;
    const lastCurrentUserId =
        currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;
    if (!currentUserBeforeSubmit && replyState.username) isAuthenticating = true;

    if (
        isEditorHtmlEffectivelyEmpty(replyState.comment ?? '') ||
        (!allowAnon &&
            (!(replyState.username || (currentUserBeforeSubmit as any)?.username) ||
                (!allowAnon &&
                    !(
                        replyState.email ||
                        (currentUserBeforeSubmit && 'email' in currentUserBeforeSubmit && (currentUserBeforeSubmit as any).email)
                    ))))
    ) {
        // The submit can't proceed (no text, or guest hasn't supplied the
        // name/email this tenant requires). The caller turned the spinner on
        // before awaiting us; reset it so it doesn't hang forever, and surface
        // the name/email form when identity is what's missing.
        const missingIdentity =
            !isEditorHtmlEffectivelyEmpty(replyState.comment ?? '') &&
            !allowAnon &&
            !(replyState.username || (currentUserBeforeSubmit as any)?.username);
        const patch: Partial<CommentReplyState> = { isReplySaving: false };
        if (missingIdentity) patch.showAuthInputForm = true;
        setReplyState(patch);
        return;
    }

    const tenantIdToUse = getActionTenantId({ store, tenantId: parentComment?.tenantId });
    const urlIdToUse = getActionURLID({ store, urlId: parentComment?.urlId });

    const date = new Date();
    const userWithUsername = currentUserBeforeSubmit as { username?: string } | null;
    const userWithEmail = currentUserBeforeSubmit as { email?: string } | null;
    const userWithWebsite = currentUserBeforeSubmit as { websiteUrl?: string } | null;
    const userWithAvatar = currentUserBeforeSubmit as { avatarSrc?: string } | null;
    const userWithSessionId = currentUserBeforeSubmit as { sessionId?: string } | null;
    const commenterName =
        userWithUsername && 'username' in (userWithUsername as object)
            ? userWithUsername.username
            : replyState.username;
    const commenterEmail =
        userWithEmail && 'email' in (userWithEmail as object)
            ? userWithEmail.email
            : replyState.email;
    const commenterLink =
        userWithWebsite && 'websiteUrl' in (userWithWebsite as object)
            ? userWithWebsite.websiteUrl
            : replyState.websiteUrl;
    const avatarSrc =
        userWithAvatar && state.config.simpleSSO ? userWithAvatar.avatarSrc : undefined;
    const sessionId =
        userWithSessionId && 'sessionId' in (userWithSessionId as object)
            ? userWithSessionId.sessionId
            : undefined;

    const commentData: CommentData = {
        url: state.config.url ?? '',
        urlId: urlIdToUse,
        pageTitle: state.config.pageTitle,
        commenterName: commenterName ?? '',
        commenterEmail: commenterEmail ?? null,
        commenterLink: commenterLink ?? null,
        avatarSrc: avatarSrc ?? null,
        comment: serverCommentHtml,
        parentId: replyingToId ?? null,
        date: date.valueOf(),
        localDateString: date.toString(),
        localDateHours: date.getHours(),
        productId: state.config.productId,
        meta: state.config.commentMeta,
        moderationGroupIds: state.config.moderationGroupIds,
        isFromMyAccountPage: state.config.tenantId === 'all',
    };
    const broadcastId = newBroadcastId(store);

    try {
        const sdk = state.sdk;
        const response = await sdk.publicApi.createCommentPublic({
            tenantId: tenantIdToUse,
            urlId: urlIdToUse,
            broadcastId,
            commentData,
            sessionId,
            sso: state.ssoConfigString,
        });

        let showSuccessMessage = false;
        if (response.customConfig)
            handleNewCustomConfig(
                store,
                response.customConfig as unknown as Parameters<typeof handleNewCustomConfig>[1]
            );
        const wasSuccessful = response.status === 'success' && !!response.comment;
        const comment: RNComment | null = wasSuccessful
            ? publicCommentToRNComment(response.comment, tenantIdToUse, urlIdToUse)
            : null;
        const latest = store.getState();
        if (wasSuccessful && comment) {
            comment.wasPostedCurrentSession = true;
            if (replyingToId) comment.repliesHidden = false;
            latest.upsertComment(comment, !!latest.config.newCommentsToBottom);
            incOverallCommentCount(latest.config.countAll, store, comment.parentId);

            if (response.user) {
                // Merge the server's user into the existing session, like the web
                // widget (frontend/comment-ui copies each response.user key onto
                // currentUser). The server returns an authorized user with the
                // email/username the guest just entered; consuming it hides the
                // name/email form and populates the top bar. Merging (vs replacing)
                // preserves any fields the response omits (e.g. avatar).
                const existingUser = latest.currentUser as object | null;
                latest.setCurrentUser(
                    (existingUser
                        ? { ...existingUser, ...response.user }
                        : response.user) as FastCommentsSessionUser
                );
                onAuthenticationChange &&
                    onAuthenticationChange('user-set', store.getState().currentUser, comment);
            }

            if (
                currentUserBeforeSubmit &&
                response.user &&
                'sessionId' in response.user &&
                response.user.sessionId
            ) {
                // Apply the sessionId on top of the freshly-merged user. Reading
                // `store.getState().currentUser` (not the stale `latest` snapshot
                // captured before the merge above) avoids reverting to the prior
                // anon user, which is what kept the auth form showing after submit.
                const mergedUser = store.getState().currentUser as object | null;
                if (mergedUser) {
                    latest.setCurrentUser({
                        ...mergedUser,
                        sessionId: response.user.sessionId,
                    } as FastCommentsSessionUser);
                    onAuthenticationChange &&
                        onAuthenticationChange('session-id-set', store.getState().currentUser, comment);
                }
            }
            if (replyingToId === null && !latest.config.disableSuccessMessage) showSuccessMessage = true;
            const newCurrentUserId =
                currentUserBeforeSubmit && 'id' in currentUserBeforeSubmit ? currentUserBeforeSubmit.id : null;

            if (newCurrentUserId !== lastCurrentUserId || response.userIdWS !== latest.userIdWS) {
                // TODO: persistSubscriberState(store, urlIdWS, tenantIdWS, response.userIdWS);
            } else if (response.userIdWS) {
                void setupUserPresenceState(store, response.userIdWS);
            }
        } else {
            if (isAuthenticating) {
                latest.setCurrentUser(null);
                onAuthenticationChange && onAuthenticationChange('authentication-failed', null, comment);
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
            tooLongLimit: undefined,
        };
        if (wasSuccessful) {
            patch.username = undefined;
            patch.email = undefined;
            patch.websiteUrl = undefined;
            patch.comment = '';
            // Clear the editor only now (success), not before/while saving.
            clearEditor?.();
        }
        setReplyState(patch);

        if (wasSuccessful && comment) onReplySuccess && onReplySuccess(comment);
    } catch (caught: unknown) {
        const errorResponse = caught as Partial<CreateCommentPublic200Response> | undefined;
        if (errorResponse && errorResponse.customConfig) {
            handleNewCustomConfig(
                store,
                errorResponse.customConfig as unknown as Parameters<typeof handleNewCustomConfig>[1]
            );
        }
        if (isAuthenticating) {
            store.getState().setCurrentUser(null);
            onAuthenticationChange &&
                onAuthenticationChange('authentication-failed', null, null);
        }
        setReplyState({
            isReplySaving: false,
            showAuthInputForm: false,
            showSuccessMessage: false,
            lastSaveResponse: errorResponse as CreateCommentPublic200Response | undefined,
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
    const hideTopBar = useStoreValue(store, (s) => !!s.config.hideTopBar);
    const disableEmailInputs = useStoreValue(store, (s) => !!s.config.disableEmailInputs);
    const useInlineSubmitButton = useStoreValue(store, (s) => !!s.config.useInlineSubmitButton);
    const enableCommenterLinks = useStoreValue(store, (s) => !!s.config.enableCommenterLinks);
    const ssoConfig = useStoreValue(store, (s) => s.config.sso || s.config.simpleSSO);
    const inlineReactImages = useStoreValue(store, (s) => s.config.inlineReactImages);

    // Mirror the web widget (frontend/shared/get-reply-area-html.ts): a guest must
    // supply a name (and email, unless the tenant allows fully-anonymous) before
    // commenting. Show the auth prompt when there's no authorized user, or when an
    // anon session still owes us an email. The old `!currentUser && !!parentComment`
    // was wrong: it only prompted on replies and treated the anon session (which
    // exists from connect, with no username/email) as fully logged in - so root
    // comments silently failed validation.
    const currentUserAny = currentUser as { authorized?: boolean; isAnonSession?: boolean; email?: string } | null | undefined;
    const anonSessionNeedsEmail = !!(currentUserAny && currentUserAny.isAnonSession && !currentUserAny.email && !allowAnon);
    const needsAuth = !currentUserAny || !currentUserAny.authorized || anonSessionNeedsEmail;
    const valueGetter: ValueObserver = {};
    const focusObserver: FocusObserver = {};
    // The editor re-binds getValue against a fresh observer each render; the
    // ref keeps the registered dirty-check pointing at the live one.
    const valueGetterRef = useRef<ValueObserver>(valueGetter);
    valueGetterRef.current = valueGetter;

    const [commentReplyState, setCommentReplyStateRaw] = useState<CommentReplyState>({
        isReplySaving: false,
        showSuccessMessage: false,
        // Progressive disclosure: the name/email fields appear once the user
        // focuses the editor (or submits), not as a permanent registration form.
        showAuthInputForm: false,
    });
    const setCommentReplyState = (patch: Partial<CommentReplyState>) =>
        setCommentReplyStateRaw((prev) => ({ ...prev, ...patch }));

    useEffect(() => {
        if (parentComment) focusObserver.setFocused && focusObserver.setFocused(true);
    }, [parentComment]);

    // Closing an EMPTY reply needs no "discard?" confirmation; register a
    // dirty check the close flow consults.
    useEffect(() => {
        if (!parentComment) return;
        store.getState().setReplyDirtyCheck(() => {
            const getValue = valueGetterRef.current.getValue;
            return !isEditorHtmlEffectivelyEmpty(getValue ? getValue() : '');
        });
        return () => store.getState().setReplyDirtyCheck(null);
    }, [parentComment?._id]);

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

    if (needsAuth && ssoConfig && !allowAnon) {
        if (ssoConfig.loginURL || ssoConfig.loginCallback) {
            ssoLoginWrapper = (
                <View style={styles.replyArea?.ssoLoginWrapper}>
                    <TouchableOpacity
                        testID="ssoLoginButton"
                        accessibilityLabel="ssoLoginButton"
                        style={styles.replyArea?.ssoLoginButton}
                        onPress={async () => {
                            if (ssoConfig.loginURL) await Linking.openURL(ssoConfig.loginURL);
                            else if (ssoConfig.loginCallback) ssoConfig.loginCallback('');
                        }}
                    >
                        <Image source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BUBBLE : FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{ width: 22, height: 22 }} />
                        <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN}</Text>
                    </TouchableOpacity>
                </View>
            );
        } else {
            ssoLoginWrapper = (
                <View style={styles.replyArea?.ssoLoginWrapper}>
                    <View style={styles.replyArea?.ssoLoginButton}>
                        <Image source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BUBBLE : FastCommentsImageAsset.ICON_BUBBLE_WHITE]} style={{ width: 22, height: 22 }} />
                        <Text style={styles.replyArea?.ssoLoginButtonText}>{translations.LOG_IN_TO_COMMENT}</Text>
                    </View>
                </View>
            );
        }
    } else {
        // A ghost anon session (stale cookie, no username) must not light up
        // logged-in chrome: empty username, Log Out, and notifications all 401.
        if (!parentComment && currentUser && isIdentifiedUser(currentUser) && !hideTopBar) {
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
                        <Text style={styles.replyArea?.topBarUsername} testID="topBarUsername">{(currentUser as any).username}</Text>
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
                    onSubmit={() => handleSubmit()}
                    saving={commentReplyState.isReplySaving}
                    pickImage={pickImage}
                    pickGIF={pickGIF}
                />
            );
        }

        const handleSubmit = async () => {
            const latestValue = valueGetter.getValue ? valueGetter.getValue() : '';
            if (commentReplyState.showSuccessMessage && !parentComment) {
                setCommentReplyState({ showSuccessMessage: false });
            } else {
                setCommentReplyState({ isReplySaving: true });
                try {
                    // Pass the latest editor value directly (the editor owns its
                    // text; we don't mirror it into state, which would re-sync the
                    // `value` prop and flicker the box). The editor is cleared
                    // imperatively (clearEditor) ONLY on a successful submit.
                    await submit(
                        { store, parentComment, onReplySuccess, onAuthenticationChange, clearEditor: () => valueGetter.reset?.() },
                        { ...commentReplyState, comment: latestValue },
                        setCommentReplyState
                    );
                } catch (e) {
                    console.error('Failed to save a comment', e);
                }
                if (parentComment) parentComment.replyBoxOpen = false;
            }
        };

        // Inline mode anchors an icon-only send button inside the comment box
        // (the standalone labeled button is not rendered).
        const inlineSubmitButton = useInlineSubmitButton ? (
            <TouchableOpacity
                testID="inlineSendButton"
                accessibilityLabel="inlineSendButton"
                style={styles.replyArea?.inlineSubmitButton}
                disabled={commentReplyState.isReplySaving}
                onPress={handleSubmit}
            >
                <Image
                    source={
                        hasDarkBackground
                            ? imageAssets[FastCommentsImageAsset.ICON_RETURN_WHITE]
                            : imageAssets[FastCommentsImageAsset.ICON_RETURN]
                    }
                    style={styles.replyArea?.inlineSubmitButtonIcon}
                />
            </TouchableOpacity>
        ) : null;

        commentInputArea = (
            <View
                style={[
                    styles.replyArea?.commentInputArea,
                    commentReplyState.isReplySaving ? styles.replyArea?.commentInputAreaReplySaving : null,
                ]}
            >
                {commentInputAreaContent}
                {inlineSubmitButton}
            </View>
        );

        if (!useInlineSubmitButton) {
            commentSubmitButton = (
                <View style={styles.replyArea?.replyButtonWrapper}>
                    <TouchableOpacity
                        testID="sendButton"
                        accessibilityLabel="sendButton"
                        style={styles.replyArea?.replyButton}
                        disabled={commentReplyState.isReplySaving}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.replyArea?.replyButtonText}>
                            {commentReplyState.showSuccessMessage ? translations.WRITE_ANOTHER_COMMENT : translations.SUBMIT_REPLY}
                        </Text>
                        <Image
                            source={
                                // Icon must match the button's onPrimary text color, not the
                                // page background: the filled button is `primary` (off-black in
                                // the light theme), so the icon is white there and dark in the
                                // dark theme (light button). This is the inverse of hasDarkBackground.
                                parentComment
                                    ? hasDarkBackground
                                        ? imageAssets[FastCommentsImageAsset.ICON_RETURN]
                                        : imageAssets[FastCommentsImageAsset.ICON_RETURN_WHITE]
                                    : hasDarkBackground
                                    ? imageAssets[FastCommentsImageAsset.ICON_BUBBLE]
                                    : imageAssets[FastCommentsImageAsset.ICON_BUBBLE_WHITE]
                            }
                            style={styles.replyArea?.replyButtonIcon}
                        />
                    </TouchableOpacity>
                </View>
            );
        }

        // Progressive disclosure: the name/email inputs stay hidden until the
        // guest engages (focuses the editor or submits), so the composer reads
        // as a comment box rather than a registration form.
        const showAuth =
            commentReplyState.showAuthInputForm ||
            (commentReplyState.lastSaveResponse?.code &&
                SignUpErrorsTranslationIds[commentReplyState.lastSaveResponse.code!]);
        if (showAuth) {
            authFormArea = (
                <View style={styles.replyArea?.userInfoInput} testID="authInputForm">
                    {!disableEmailInputs && (
                        <Text style={styles.replyArea?.emailReasoning}>
                            {allowAnon ? translations.ENTER_EMAIL_TO_KEEP_COMMENT : translations.ENTER_EMAIL_TO_COMMENT}
                        </Text>
                    )}
                    {!disableEmailInputs && (
                        <TextInput
                            testID="authEmailInput"
                            accessibilityLabel="authEmailInput"
                            style={styles.replyArea?.authInput}
                            multiline={false}
                            maxLength={70}
                            placeholder={translations.EMAIL_FOR_VERIFICATION}
                            textContentType="emailAddress"
                            keyboardType="email-address"
                            autoComplete="email"
                            value={commentReplyState.email || ''}
                            returnKeyType={enableCommenterLinks ? 'next' : 'send'}
                            onChangeText={(value) => setCommentReplyState({ email: value })}
                        />
                    )}
                    <TextInput
                        testID="authUsernameInput"
                        accessibilityLabel="authUsernameInput"
                        style={styles.replyArea?.authInput}
                        multiline={false}
                        maxLength={70}
                        placeholder={translations.PUBLICLY_DISPLAYED_USERNAME}
                        textContentType="username"
                        autoComplete="username"
                        value={commentReplyState.username || ''}
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
    if (commentReplyState.tooLongLimit) {
        displayError = (
            <Text style={styles.replyArea?.error} testID="commentTooLongError" accessibilityLabel="commentTooLongError">
                {translations.COMMENT_TOO_BIG.replace('[count]', String(commentReplyState.tooLongLimit))}
            </Text>
        );
    } else if (lastSaveResponse && lastSaveResponse.status !== 'success') {
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
            displayError = <Text style={styles.replyArea?.error}>{lastSaveResponse.translatedError}</Text>;
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
        </View>
    );
}
