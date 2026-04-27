import { Dispatch, SetStateAction } from 'react';
import { FastCommentsCallbacks, FastCommentsImageAsset } from '../types';
import { Alert, Image } from 'react-native';
import type { PublicBlockFromCommentParams } from 'fastcomments-sdk';
import { showError } from '../services/show-error';
import { CommentActionEdit, DirtyRef } from './comment-action-edit';
import { CommentPromptDelete } from './comment-action-delete';
import { repositionComment } from '../services/comment-positioning';
import { CAN_CLOSE, CAN_NOT_CLOSE, ModalMenuItem } from './modal-menu';
import { IFastCommentsStyles, RNComment } from '../types';
import type { FastCommentsCommentPositions } from '../types/dto/websocket-live-event';
import { addTranslationsToStore } from '../services/translations';
import { newBroadcastId } from '../services/broadcast-id';
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
            response.code === 'edit-key-invalid' ? translations.LOGIN_TO_EDIT : translations.FAILED_TO_SAVE_EDIT;
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
            response.translatedError ? response.translatedError : translations.ERROR_MESSAGE,
            translations.DISMISS,
            onError
        );
    }
}

export interface CommentMenuState {
    canEdit: boolean;
    canPin: boolean;
    canBlockOrFlag: boolean;
}

export function getCommentMenuState(store: FastCommentsStore, comment: RNComment): CommentMenuState {
    const state = store.getState();
    const currentUser = state.currentUser;
    const isMyComment =
        !!currentUser &&
        'id' in currentUser &&
        (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    const canEdit =
        !comment.isDeleted &&
        !!(
            currentUser &&
            'authorized' in currentUser &&
            !!currentUser.authorized &&
            (state.isSiteAdmin || isMyComment)
        );
    const canPin = state.isSiteAdmin && !comment.parentId;
    const canBlockOrFlag =
        !comment.isDeleted &&
        !comment.isByAdmin &&
        !comment.isByModerator &&
        !isMyComment &&
        !!currentUser &&
        'authorized' in currentUser &&
        !!currentUser.authorized;
    return { canEdit, canPin, canBlockOrFlag };
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
    { canEdit, canPin, canBlockOrFlag }: CommentMenuState
) {
    const state = store.getState();
    const hasDarkBackground = !!state.config.hasDarkBackground;
    const menuItems: ModalMenuItem[] = [];

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
                        Alert.alert(t.CONFIRM_CANCEL_EDIT_TITLE, t.CONFIRM_CANCEL_EDIT, [
                            {
                                text: t.CONFIRM_CANCEL_EDIT_CANCEL,
                                onPress: () => resolve(CAN_NOT_CLOSE),
                                style: 'cancel',
                            },
                            {
                                text: t.CONFIRM_CANCEL_EDIT_OK,
                                onPress: () => resolve(CAN_CLOSE),
                                style: 'destructive',
                            },
                        ], { onDismiss: () => resolve(CAN_NOT_CLOSE) });
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

    if (canEdit) {
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

    if (canBlockOrFlag) {
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
            Alert.alert(title, message, [
                {
                    text: t.CANCEL,
                    style: 'cancel',
                },
                {
                    text: confirmLabel,
                    style: doBlock ? 'destructive' : 'default',
                    onPress: async () => {
                        await setCommentBlockedStatus(comment, store, doBlock, onError);
                        if (onUserBlocked) {
                            const currentUser = store.getState().currentUser;
                            if (currentUser && 'id' in currentUser) {
                                onUserBlocked(currentUser.id, comment, doBlock);
                            }
                        }
                    },
                },
            ]);
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
                                          ? FastCommentsImageAsset.ICON_BLOCK_WHITE
                                          : FastCommentsImageAsset.ICON_BLOCK
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
                                          ? FastCommentsImageAsset.ICON_BLOCK_WHITE
                                          : FastCommentsImageAsset.ICON_BLOCK
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

    return menuItems;
}
