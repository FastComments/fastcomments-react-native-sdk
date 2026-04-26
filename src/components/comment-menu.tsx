import { Dispatch, SetStateAction } from 'react';
import { FastCommentsCallbacks, FastCommentsImageAsset } from '../types';
import { Alert, Image } from 'react-native';
import { createURLQueryString, makeRequest } from '../services/http';
import { showError } from '../services/show-error';
import { GetCommentTextResponse } from '../types';
import { CommentActionEdit, DirtyRef } from './comment-action-edit';
import { CommentPromptDelete } from './comment-action-delete';
import { repositionComment } from '../services/comment-positioning';
import { PinCommentResponse } from '../types';
import { BlockCommentResponse } from '../types';
import { CAN_CLOSE, CAN_NOT_CLOSE, ModalMenuItem } from './modal-menu';
import { IFastCommentsStyles, RNComment } from '../types';
import { addTranslationsToStore, getMergedTranslations } from '../services/translations';
import { newBroadcastId } from '../services/broadcast-id';
import { GetTranslationsResponse } from '../types';
import { CommentCancelTranslations } from '../types';
import type { FastCommentsStore } from '../store/types';

async function startEditingComment(
    comment: RNComment,
    store: FastCommentsStore,
    setModalId: Dispatch<SetStateAction<string | null>>,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost,
        method: 'GET',
        url: `/comments/${state.config.tenantId}/${comment._id}/text${createURLQueryString({
            sso: state.ssoConfigString,
            editKey: comment.editKey,
        })}`,
    });
    if (response.status === 'success') {
        comment.comment = response.commentText;
        store.getState().mergeCommentFields(comment._id, { comment: response.commentText });
        setModalId('edit');
    } else {
        const translations = getMergedTranslations(state.translations, response);
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
    const response = await makeRequest<PinCommentResponse>({
        apiHost: state.apiHost,
        method: 'POST',
        url: `/comments/${state.config.tenantId}/${comment._id}/${doPin ? 'pin' : 'unpin'}${createURLQueryString({
            sso: state.ssoConfigString,
            editKey: comment.editKey,
            broadcastId: newBroadcastId(store),
        })}`,
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isPinned: doPin });
        if (response.commentPositions) {
            repositionComment(comment._id, response.commentPositions, store);
        }
    } else {
        const translations = getMergedTranslations(state.translations, response);
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
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost,
        method: doBlock ? 'POST' : 'DELETE',
        url: `/block-from-comment/${comment._id}/${createURLQueryString({
            tenantId: state.config.tenantId,
            urlId: state.config.urlId,
            sso: state.ssoConfigString,
            editKey: comment.editKey,
            broadcastId: newBroadcastId(store),
        })}`,
        body: { commentIds: Object.keys(state.byId) },
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
        const translations = getMergedTranslations(state.translations, response);
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
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost,
        method: 'POST',
        url: `/flag-comment/${comment._id}/${createURLQueryString({
            tenantId: state.config.tenantId,
            urlId: state.config.urlId,
            sso: state.ssoConfigString,
            isFlagged: doFlag,
            broadcastId: newBroadcastId(store),
        })}`,
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, { isFlagged: doFlag });
    } else {
        const translations = getMergedTranslations(state.translations, response);
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
                        let url = '/translations/widgets/comment-ui-cancel?useFullTranslationIds=true';
                        if (freshState.config.locale) url += '&locale=' + freshState.config.locale;
                        const translationsResponse = await makeRequest<GetTranslationsResponse<CommentCancelTranslations>>({
                            apiHost: freshState.apiHost,
                            method: 'GET',
                            url,
                        });
                        if (translationsResponse.status === 'success') {
                            addTranslationsToStore(store, translationsResponse.translations!);
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
                          await setCommentBlockedStatus(comment, store, false, onError);
                          if (onUserBlocked) {
                              const currentUser = store.getState().currentUser;
                              if (currentUser && 'id' in currentUser) {
                                  onUserBlocked(currentUser.id, comment, false);
                              }
                          }
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
                          await setCommentBlockedStatus(comment, store, true, onError);
                          if (onUserBlocked) {
                              const currentUser = store.getState().currentUser;
                              if (currentUser && 'id' in currentUser) {
                                  onUserBlocked(currentUser.id, comment, true);
                              }
                          }
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
