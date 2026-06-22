import { Dispatch, SetStateAction } from 'react';
import { FastCommentsCallbacks, FastCommentsImageAsset } from '../types';
import { Image } from 'react-native';
import { showConfirmDialog } from '../services/dialogs';
import type { PublicBlockFromCommentParams } from 'fastcomments-sdk';
import { showError } from '../services/show-error';
import { responseExtras } from '../services/api-response-extras';
import { CommentActionEdit, DirtyRef } from './comment-action-edit';
import { CommentPromptDelete } from './comment-action-delete';
import { CommentActionBan } from './comment-action-ban';
import { CommentActionBadge } from './comment-action-badge';
import { CommentActionViewByIP } from './comment-action-view-ip';
import { repositionComment } from '../services/comment-positioning';
import { CAN_CLOSE, CAN_NOT_CLOSE, ModalMenuItem } from './modal-menu';
import { IFastCommentsStyles, RNComment } from '../types';
import type { FastCommentsCommentPositions } from '../types/dto/websocket-live-event';
import { addTranslationsToStore } from '../services/translations';
import { newBroadcastId } from '../services/broadcast-id';
import { getActionTenantId } from '../services/tenants';
import type { FastCommentsStore } from '../store/types';

async function startEditingComment(
    comment: RNComment,
    store: FastCommentsStore,
    setModalId: Dispatch<SetStateAction<string | null>>,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.getCommentText({
        tenantId: state.config.tenantId!,
        commentId: comment._id,
        editKey: comment.editKey,
        sso: state.ssoConfigString,
    });
    if (response.status === 'success') {
        comment.comment = response.commentText;
        store.getState().mergeCommentFields(comment._id, { comment: response.commentText });
        setModalId('edit');
    } else {
        const translations = state.translations;
        const message =
            responseExtras(response).code === 'edit-key-invalid' ? translations.LOGIN_TO_EDIT : translations.FAILED_TO_SAVE_EDIT;
        showError(':(', message, translations.DISMISS, onError);
    }
}

async function setCommentPinStatus(
    comment: RNComment,
    store: FastCommentsStore,
    doPin: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const sdk = state.sdk;
    const tenantId = state.config.tenantId!;
    const broadcastId = newBroadcastId(store);
    const response = doPin
        ? await sdk.publicApi.pinComment({
              tenantId,
              commentId: comment._id,
              broadcastId,
              sso: state.ssoConfigString,
          })
        : await sdk.publicApi.unPinComment({
              tenantId,
              commentId: comment._id,
              broadcastId,
              sso: state.ssoConfigString,
          });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isPinned: doPin });
        if (response.commentPositions) {
            const positions: FastCommentsCommentPositions = {
                OF: response.commentPositions.OF ?? { before: null, after: null },
                NF: response.commentPositions.NF ?? { before: null, after: null },
                MR: response.commentPositions.MR ?? { before: null, after: null },
            };
            repositionComment(comment._id, positions, store);
        }
    } else {
        const translations = state.translations;
        showError(':(', translations.ERROR_MESSAGE, translations.DISMISS, onError);
    }
}

async function setCommentLockStatus(
    comment: RNComment,
    store: FastCommentsStore,
    doLock: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const sdk = state.sdk;
    const tenantId = state.config.tenantId!;
    const broadcastId = newBroadcastId(store);
    const response = doLock
        ? await sdk.publicApi.lockComment({
              tenantId,
              commentId: comment._id,
              broadcastId,
              sso: state.ssoConfigString,
          })
        : await sdk.publicApi.unLockComment({
              tenantId,
              commentId: comment._id,
              broadcastId,
              sso: state.ssoConfigString,
          });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isLocked: doLock });
    } else {
        const translations = state.translations;
        showError(':(', translations.ERROR_MESSAGE, translations.DISMISS, onError);
    }
}

async function setCommentApprovalStatus(
    comment: RNComment,
    store: FastCommentsStore,
    approved: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const response = await state.sdk.moderationApi.postSetCommentApprovalStatus({
        tenantId: getActionTenantId({ store, tenantId: comment.tenantId }),
        commentId: comment._id,
        approved,
        // Tag our own write so the live echo is filtered out - otherwise the
        // server's broadcast would remove the (now unapproved) comment from our
        // own view instead of leaving it styled in place.
        broadcastId: newBroadcastId(store),
        sso: state.ssoConfigString,
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { approved });
    } else {
        const translations = state.translations;
        showError(':(', translations.ERROR_MESSAGE, translations.DISMISS, onError);
    }
}

async function setCommentSpamStatus(
    comment: RNComment,
    store: FastCommentsStore,
    spam: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const response = await state.sdk.moderationApi.postSetCommentSpamStatus({
        tenantId: getActionTenantId({ store, tenantId: comment.tenantId }),
        commentId: comment._id,
        spam,
        broadcastId: newBroadcastId(store),
        sso: state.ssoConfigString,
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isSpam: spam });
    } else {
        const translations = state.translations;
        showError(':(', translations.ERROR_MESSAGE, translations.DISMISS, onError);
    }
}

async function setCommentBlockedStatus(
    comment: RNComment,
    store: FastCommentsStore,
    doBlock: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const sdk = state.sdk;
    const tenantId = state.config.tenantId!;
    const publicBlockFromCommentParams: PublicBlockFromCommentParams = {
        commentIds: Object.keys(state.byId),
    };
    const response = doBlock
        ? await sdk.publicApi.blockFromCommentPublic({
              tenantId,
              commentId: comment._id,
              publicBlockFromCommentParams,
              sso: state.ssoConfigString,
          })
        : await sdk.publicApi.unBlockCommentPublic({
              tenantId,
              commentId: comment._id,
              publicBlockFromCommentParams,
              sso: state.ssoConfigString,
          });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isBlocked: doBlock });
        const latest = store.getState();
        for (const otherCommentId in response.commentStatuses) {
            const existing = latest.byId[otherCommentId];
            if (!existing) continue;
            const newValue = response.commentStatuses[otherCommentId];
            if (!!existing.isBlocked !== newValue) {
                store.getState().mergeCommentFields(otherCommentId, { isBlocked: newValue });
            }
        }
    } else {
        const translations = state.translations;
        showError(':(', translations.ERROR_MESSAGE, translations.DISMISS, onError);
    }
}

async function setCommentFlaggedStatus(
    comment: RNComment,
    store: FastCommentsStore,
    doFlag: boolean,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.flagCommentPublic({
        tenantId: state.config.tenantId!,
        commentId: comment._id,
        isFlagged: doFlag,
        sso: state.ssoConfigString,
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isFlagged: doFlag });
    } else {
        const translations = state.translations;
        showError(
            ':(',
            responseExtras(response).translatedError ?? translations.ERROR_MESSAGE,
            translations.DISMISS,
            onError
        );
    }
}

export interface CommentMenuState {
    canEdit: boolean;
    canDelete: boolean;
    canPin: boolean;
    canLock: boolean;
    canBlock: boolean;
    canFlag: boolean;
    // Moderator actions (site admin / moderator only), parity with the web
    // widget's moderation extension.
    canApprove: boolean;
    canMarkSpam: boolean;
    canBan: boolean;
    canGiveBadge: boolean;
    canRemoveBadge: boolean;
    canViewByIP: boolean;
}

export function getCommentMenuState(store: FastCommentsStore, comment: RNComment): CommentMenuState {
    const state = store.getState();
    const currentUser = state.currentUser;
    const isMyComment =
        !!currentUser &&
        'id' in currentUser &&
        (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    const authorized = !!(currentUser && 'authorized' in currentUser && !!currentUser.authorized);
    const isAdmin = state.isSiteAdmin;
    const isLocked = !!comment.isLocked;
    // Author or admin can manage their comment; a locked comment is editable
    // only by an admin and deletable by nobody (matches the web widget).
    const canManage = !comment.isDeleted && authorized && (isAdmin || isMyComment);
    const canEdit = canManage && (!isLocked || isAdmin);
    const canDelete = canManage && !isLocked;
    const canPin = isAdmin && !comment.parentId;
    const canLock = isAdmin && !comment.isDeleted;
    const canBlockOrFlag =
        !comment.isDeleted && !comment.isByAdmin && !comment.isByModerator && !isMyComment && authorized;
    const canBlock = canBlockOrFlag && !state.config.disableBlocking;
    const canFlag = canBlockOrFlag;
    // Moderation actions require admin/moderator. They authorize server-side via
    // the SSO token (the same credential pin/lock use), so no extra client check.
    const canApprove = isAdmin && !comment.isDeleted;
    const canMarkSpam = isAdmin && !comment.isDeleted;
    const canBan = isAdmin && !comment.isDeleted && !isMyComment;
    // Badges target registered (logged-in) users, identified by userId.
    const canGiveBadge = isAdmin && !!comment.userId;
    const canRemoveBadge = isAdmin && !!comment.userId && !!comment.badges?.length;
    // The web hides view-by-IP for SSO sessions because it redirects to the
    // dashboard; here it opens an in-app list, so it's available to any admin.
    const canViewByIP = isAdmin;
    return {
        canEdit,
        canDelete,
        canPin,
        canLock,
        canBlock,
        canFlag,
        canApprove,
        canMarkSpam,
        canBan,
        canGiveBadge,
        canRemoveBadge,
        canViewByIP,
    };
}

export interface GetCommentMenuItemsProps
    extends Pick<FastCommentsCallbacks, 'pickGIF' | 'pickImage' | 'onUserBlocked' | 'onCommentFlagged' | 'onError'> {
    comment: RNComment;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export interface OpenCommentMenuRequest {
    comment: RNComment;
    menuState: CommentMenuState;
    /** Web: viewport rect of the trigger so the menu anchors as a dropdown. **/
    anchor?: { top: number; bottom: number; right: number };
}

export function getCommentMenuItems(
    {
        comment,
        onCommentFlagged,
        onError,
        onUserBlocked,
        pickGIF,
        pickImage,
        styles,
        store,
    }: GetCommentMenuItemsProps,
    {
        canEdit,
        canDelete,
        canPin,
        canLock,
        canBlock,
        canFlag,
        canApprove,
        canMarkSpam,
        canBan,
        canGiveBadge,
        canRemoveBadge,
        canViewByIP,
    }: CommentMenuState
) {
    const state = store.getState();
    const hasDarkBackground = !!state.config.hasDarkBackground;
    const menuItems: ModalMenuItem[] = [];
    // Picks the light/dark icon variant for the current background.
    const imgIcon = (light: FastCommentsImageAsset, dark: FastCommentsImageAsset) => (
        <Image source={state.imageAssets[hasDarkBackground ? dark : light]} style={styles.commentMenu?.itemIcon} />
    );

    if (canEdit) {
        const isDirtyRef: DirtyRef = {};
        menuItems.push({
            id: 'edit',
            label: state.translations.COMMENT_MENU_EDIT,
            icon: (
                <Image
                    source={
                        state.imageAssets[
                            hasDarkBackground
                                ? FastCommentsImageAsset.ICON_EDIT_BIG_WHITE
                                : FastCommentsImageAsset.ICON_EDIT_BIG
                        ]
                    }
                    style={styles.commentMenu?.itemIcon}
                />
            ),
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await startEditingComment(comment, store, setModalId, onError);
            },
            subModalContent: (close: (safe: boolean) => void) => (
                <CommentActionEdit
                    comment={comment}
                    isDirtyRef={isDirtyRef}
                    onError={onError}
                    pickGIF={pickGIF}
                    pickImage={pickImage}
                    store={store}
                    styles={styles}
                    close={close}
                />
            ),
            requestClose: async () => {
                if (isDirtyRef.current && isDirtyRef.current()) {
                    const freshState = store.getState();
                    if (!freshState.translations.CONFIRM_CANCEL_EDIT) {
                        const sdk = freshState.sdk;
                        const translationsResponse = await sdk.publicApi.getTranslations({
                            namespace: 'widgets',
                            component: 'comment-ui-cancel',
                            useFullTranslationIds: true,
                            locale: freshState.config.locale,
                        });
                        if (translationsResponse.status === 'success' && translationsResponse.translations) {
                            addTranslationsToStore(store, translationsResponse.translations);
                        }
                    }
                    const t = store.getState().translations;
                    return new Promise((resolve) => {
                        showConfirmDialog({
                            title: t.CONFIRM_CANCEL_EDIT_TITLE,
                            message: t.CONFIRM_CANCEL_EDIT,
                            confirmText: t.CONFIRM_CANCEL_EDIT_OK,
                            cancelText: t.CONFIRM_CANCEL_EDIT_CANCEL,
                            destructive: true,
                            onConfirm: () => resolve(CAN_CLOSE),
                            onCancel: () => resolve(CAN_NOT_CLOSE),
                        });
                    });
                }
                return CAN_CLOSE;
            },
        });
    }

    if (canPin) {
        menuItems.push(
            comment.isPinned
                ? {
                      id: 'unpin',
                      label: state.translations.COMMENT_MENU_UNPIN,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_UNPIN_BIG_WHITE
                                          : FastCommentsImageAsset.ICON_UNPIN_BIG
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => setCommentPinStatus(comment, store, false, onError),
                  }
                : {
                      id: 'pin',
                      label: state.translations.COMMENT_MENU_PIN,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_PIN_BIG_WHITE
                                          : FastCommentsImageAsset.ICON_PIN_BIG
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => setCommentPinStatus(comment, store, true, onError),
                  }
        );
    }

    if (canLock) {
        const locking = !comment.isLocked;
        menuItems.push({
            id: locking ? 'lock' : 'unlock',
            label: locking ? state.translations.COMMENT_MENU_LOCK : state.translations.COMMENT_MENU_UNLOCK,
            icon: locking
                ? imgIcon(FastCommentsImageAsset.ICON_LOCK, FastCommentsImageAsset.ICON_LOCK_WHITE)
                : imgIcon(FastCommentsImageAsset.ICON_UNLOCK, FastCommentsImageAsset.ICON_UNLOCK_WHITE),
            handler: async () => setCommentLockStatus(comment, store, locking, onError),
        });
    }

    if (canApprove) {
        // `approved === false` means the comment is awaiting approval.
        const approving = comment.approved === false;
        menuItems.push({
            id: approving ? 'approve' : 'unapprove',
            label: approving ? state.translations.COMMENT_MENU_APPROVE : state.translations.COMMENT_MENU_UNAPPROVE,
            // Web parity: approve uses the check icon, unapprove the eye-slash.
            icon: approving
                ? imgIcon(FastCommentsImageAsset.ICON_APPROVE, FastCommentsImageAsset.ICON_APPROVE_WHITE)
                : imgIcon(FastCommentsImageAsset.ICON_EYE_SLASH, FastCommentsImageAsset.ICON_EYE_SLASH_WHITE),
            handler: async () => setCommentApprovalStatus(comment, store, approving, onError),
        });
    }

    if (canMarkSpam) {
        const markingSpam = !comment.isSpam;
        menuItems.push({
            id: markingSpam ? 'spam' : 'not-spam',
            label: markingSpam ? state.translations.COMMENT_MENU_SPAM : state.translations.COMMENT_MENU_NOT_SPAM,
            icon: imgIcon(FastCommentsImageAsset.ICON_SPAM, FastCommentsImageAsset.ICON_SPAM_WHITE),
            handler: async () => setCommentSpamStatus(comment, store, markingSpam, onError),
        });
    }

    if (canGiveBadge) {
        menuItems.push({
            id: 'give-badge',
            label: state.translations.COMMENT_MENU_GIVE_BADGE,
            icon: imgIcon(FastCommentsImageAsset.ICON_BADGE, FastCommentsImageAsset.ICON_BADGE_WHITE),
            handler: async (setModalId) => setModalId('give-badge'),
            subModalContent: (close) => (
                <CommentActionBadge comment={comment} mode="give" store={store} styles={styles} onError={onError} close={close} />
            ),
        });
    }

    if (canRemoveBadge) {
        menuItems.push({
            id: 'remove-badge',
            label: state.translations.COMMENT_MENU_REMOVE_BADGE,
            icon: imgIcon(FastCommentsImageAsset.ICON_BADGE_REMOVE, FastCommentsImageAsset.ICON_BADGE_REMOVE_WHITE),
            handler: async (setModalId) => setModalId('remove-badge'),
            subModalContent: (close) => (
                <CommentActionBadge comment={comment} mode="remove" store={store} styles={styles} onError={onError} close={close} />
            ),
        });
    }

    if (canViewByIP) {
        menuItems.push({
            id: 'view-by-ip',
            label: state.translations.VIEW_ALL_FROM_IP,
            icon: imgIcon(FastCommentsImageAsset.ICON_IP, FastCommentsImageAsset.ICON_IP_WHITE),
            handler: async (setModalId) => setModalId('view-by-ip'),
            subModalContent: (close) => (
                <CommentActionViewByIP comment={comment} store={store} styles={styles} close={close} />
            ),
        });
    }

    if (canDelete) {
        menuItems.push({
            id: 'delete',
            label: state.translations.COMMENT_MENU_DELETE,
            icon: (
                <Image
                    source={
                        state.imageAssets[
                            hasDarkBackground
                                ? FastCommentsImageAsset.ICON_TRASH_WHITE
                                : FastCommentsImageAsset.ICON_TRASH
                        ]
                    }
                    style={styles.commentMenu?.itemIcon}
                />
            ),
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await CommentPromptDelete({
                    comment,
                    store,
                    onError,
                    close: () => setModalId(null),
                });
            },
        });
    }

    if (canBlock) {
        const promptBlock = async (doBlock: boolean) => {
            const fresh = store.getState();
            if (!fresh.translations.BLOCK_CONFIRM_MESSAGE) {
                // The block-confirm namespace lives in its own bundle; if the
                // server hasn't deployed it yet we get a 500 here. Swallow so
                // the prompt still opens with whatever fallback strings are
                // present in the store (the surrounding translations object
                // still resolves the COMMENT_MENU_* titles via comment-ui).
                try {
                    const sdk = fresh.sdk;
                    const translationsResponse = await sdk.publicApi.getTranslations({
                        namespace: 'widgets',
                        component: 'block-confirm',
                        useFullTranslationIds: true,
                        locale: fresh.config.locale,
                    });
                    if (translationsResponse.status === 'success' && translationsResponse.translations) {
                        addTranslationsToStore(store, translationsResponse.translations);
                    }
                } catch (e) {
                    // ignore - prompt still opens with whatever copy is available.
                }
            }
            const t = store.getState().translations;
            const title = doBlock ? t.COMMENT_MENU_BLOCK_USER : t.COMMENT_MENU_UNBLOCK_USER;
            const message = doBlock ? t.BLOCK_CONFIRM_MESSAGE : t.UNBLOCK_CONFIRM_MESSAGE;
            const confirmLabel = doBlock ? t.BLOCK : t.UNBLOCK;
            showConfirmDialog({
                title,
                message,
                confirmText: confirmLabel,
                cancelText: t.CANCEL,
                destructive: doBlock,
                onCancel: () => undefined,
                onConfirm: () => {
                    void (async () => {
                        await setCommentBlockedStatus(comment, store, doBlock, onError);
                        if (onUserBlocked) {
                            const currentUser = store.getState().currentUser;
                            if (currentUser && 'id' in currentUser) {
                                onUserBlocked(currentUser.id, comment, doBlock);
                            }
                        }
                    })();
                },
            });
        };

        menuItems.push(
            comment.isBlocked
                ? {
                      id: 'unblock',
                      label: state.translations.COMMENT_MENU_UNBLOCK_USER,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_BLOCK_WHITE
                                          : FastCommentsImageAsset.ICON_BLOCK
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => {
                          await promptBlock(false);
                      },
                  }
                : {
                      id: 'block',
                      label: state.translations.COMMENT_MENU_BLOCK_USER,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_BLOCK_WHITE
                                          : FastCommentsImageAsset.ICON_BLOCK
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => {
                          await promptBlock(true);
                      },
                  }
        );
    }

    if (canFlag) {
        menuItems.push(
            comment.isFlagged
                ? {
                      id: 'unflag',
                      label: state.translations.COMMENT_MENU_UNFLAG,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_FLAG_WHITE
                                          : FastCommentsImageAsset.ICON_FLAG
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => {
                          await setCommentFlaggedStatus(comment, store, false, onError);
                          if (onCommentFlagged) {
                              const currentUser = store.getState().currentUser;
                              if (currentUser && 'id' in currentUser) {
                                  onCommentFlagged(currentUser.id, comment, false);
                              }
                          }
                      },
                  }
                : {
                      id: 'flag',
                      label: state.translations.COMMENT_MENU_FLAG,
                      icon: (
                          <Image
                              source={
                                  state.imageAssets[
                                      hasDarkBackground
                                          ? FastCommentsImageAsset.ICON_FLAG_WHITE
                                          : FastCommentsImageAsset.ICON_FLAG
                                  ]
                              }
                              style={styles.commentMenu?.itemIcon}
                          />
                      ),
                      handler: async () => {
                          await setCommentFlaggedStatus(comment, store, true, onError);
                          if (onCommentFlagged) {
                              const currentUser = store.getState().currentUser;
                              if (currentUser && 'id' in currentUser) {
                                  onCommentFlagged(currentUser.id, comment, true);
                              }
                          }
                      },
                  }
        );
    }

    if (canBan) {
        menuItems.push({
            id: 'ban',
            label: state.translations.COMMENT_MENU_BAN,
            icon: imgIcon(FastCommentsImageAsset.ICON_BAN, FastCommentsImageAsset.ICON_BAN_WHITE),
            handler: async (setModalId) => setModalId('ban'),
            subModalContent: (close) => (
                <CommentActionBan comment={comment} store={store} styles={styles} onError={onError} close={close} />
            ),
        });
    }

    return menuItems;
}
