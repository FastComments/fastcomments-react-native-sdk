import {Dispatch, SetStateAction} from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types";
import {Alert, Image} from "react-native";
import {createURLQueryString, makeRequest} from "../services/http";
import {GetCommentTextResponse} from "../types";
import {CommentActionEdit} from './comment-action-edit';
import {CommentPromptDelete} from "./comment-action-delete";
import {repositionComment} from "../services/comment-positioning";
import {PinCommentResponse} from "../types";
import {BlockCommentResponse} from "../types";
import {ModalMenuItem} from "./modal-menu";
import {State} from "@hookstate/core";
import {FastCommentsState, IFastCommentsStyles, RNComment} from "../types";
import {incChangeCounter, incChangeCounterState} from "../services/comment-render-determination";
import {getMergedTranslations} from "../services/translations";
import { newBroadcastId } from '../services/broadcast-id';

async function startEditingComment({
    state,
    comment
}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'GET',
        url: `/comments/${state.config.tenantId.get()}/${comment._id}/text${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey
        })}`
    });
    if (response.status === 'success') {
        comment.comment = response.commentText;
        setModalId('edit');
    } else {
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        const message = response.code === 'edit-key-invalid' ? translations.LOGIN_TO_EDIT : translations.FAILED_TO_SAVE_EDIT;
        Alert.alert(
            ":(",
            message,
            [
                {
                    text: translations.DISMISS
                }
            ]
        );
    }
}

async function setCommentPinStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doPin: boolean) {
    const response = await makeRequest<PinCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/comments/${state.config.tenantId.get()}/${comment._id}/${doPin ? 'pin' : 'unpin'}${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey,
            broadcastId: newBroadcastId()
        })}`
    });
    if (response.status === 'success') {
        comment.isPinned = doPin;
        repositionComment(comment._id, response.commentPositions!, state);
        incChangeCounter(comment);
        incChangeCounterState(state.commentsById[comment._id]);
    } else {
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        Alert.alert(
            ":(",
            translations.ERROR_MESSAGE,
            [
                {
                    text: translations.DISMISS
                }
            ]
        );
    }
}

async function setCommentBlockedStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doBlock: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: doBlock ? 'POST' : 'DELETE',
        url: `/block-from-comment/${comment._id}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey,
            broadcastId: newBroadcastId()
        })}`,
        body: {
            commentIds: Object.keys(state.commentsById.get())
        }
    });
    if (response.status === 'success') {
        comment.isBlocked = doBlock;
        incChangeCounter(comment);
        for (const otherCommentId in response.commentStatuses) {
            if (state.commentsById[otherCommentId].get()) {
                const existing = !!state.commentsById[otherCommentId].isBlocked.get();
                const newValue = response.commentStatuses[otherCommentId];
                if (existing !== newValue) {
                    state.commentsById[otherCommentId].isBlocked.set(newValue);
                    incChangeCounter(state.commentsById[otherCommentId].get({stealth: true}));
                }
            }
        }
    } else {
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        Alert.alert(
            ":(",
            translations.ERROR_MESSAGE,
            [
                {
                    text: translations.DISMISS
                }
            ]
        );
    }
}

async function setCommentFlaggedStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doFlag: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/flag-comment/${comment._id}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            isFlagged: doFlag,
            broadcastId: newBroadcastId()
        })}`
    });
    if (response.status === 'success') {
        comment.isFlagged = doFlag;
        state.commentsById[comment._id].isFlagged.set(doFlag);
        incChangeCounter(comment);
    } else {
        // response.translatedError is supported here
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        Alert.alert(
            ":(",
            response.translatedError ? response.translatedError : translations.ERROR_MESSAGE,
            [
                {
                    text: translations.DISMISS
                }
            ]
        );
    }
}

export interface CommentMenuState {
    canEdit: boolean
    canPin: boolean
    canBlockOrFlag: boolean
}

export function getCommentMenuState(state: State<FastCommentsState>, comment: RNComment): CommentMenuState {
    const currentUser = state.currentUser.get({stealth: true});
    const isMyComment = !!currentUser && 'id' in currentUser && (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    const canEdit: boolean = !comment.isDeleted && !!((currentUser && 'authorized' in currentUser && !!currentUser.authorized && (state.isSiteAdmin.get({stealth: true}) || isMyComment))); // can have edit key and be anon
    const canPin: boolean = state.isSiteAdmin.get({stealth: true}) && !comment.parentId;
    const canBlockOrFlag: boolean = !comment.isDeleted && !comment.isByAdmin && !comment.isByModerator && !isMyComment && !!currentUser && 'authorized' in currentUser && !!currentUser.authorized;
    return {
        canEdit,
        canPin,
        canBlockOrFlag
    }
}

export interface GetCommentMenuItemsProps {
    comment: RNComment
    state: State<FastCommentsState>
    styles: IFastCommentsStyles,
}

export interface OpenCommentMenuRequest {
    comment: RNComment
    menuState: CommentMenuState
}

export function getCommentMenuItems({comment, styles, state}: GetCommentMenuItemsProps, {
    canEdit,
    canPin,
    canBlockOrFlag,
}: CommentMenuState) {
    const hasDarkBackground = state.config.hasDarkBackground.get();

    const menuItems: ModalMenuItem[] = []; // creating an array for every comment rendered is not ideal

    if (canEdit) {
        menuItems.push({
            id: 'edit',
            label: state.translations.COMMENT_MENU_EDIT.get(),
            icon: <Image
                source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_EDIT_BIG_WHITE : FastCommentsImageAsset.ICON_EDIT_BIG].get()}
                style={styles.commentMenu?.itemIcon}/>,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await startEditingComment({comment, state}, setModalId);
            },
            subModalContent: (close: () => void) => <CommentActionEdit comment={comment} state={state} styles={styles} close={close}/>
        });
    }

    if (canPin) {
        if (comment.isPinned) {
            menuItems.push({
                id: 'unpin',
                label: state.translations.COMMENT_MENU_UNPIN.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_UNPIN_BIG_WHITE : FastCommentsImageAsset.ICON_UNPIN_BIG].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentPinStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'pin',
                label: state.translations.COMMENT_MENU_PIN.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_PIN_BIG_WHITE : FastCommentsImageAsset.ICON_PIN_BIG].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentPinStatus({comment, state}, true);
                }
            });
        }
    }

    if (canEdit) {
        menuItems.push({
            id: 'delete',
            label: state.translations.COMMENT_MENU_DELETE.get(),
            icon: <Image
                source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_TRASH_WHITE : FastCommentsImageAsset.ICON_TRASH].get()}
                style={styles.commentMenu?.itemIcon}/>,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await CommentPromptDelete({
                    comment,
                    state,
                    close: () => setModalId(null)
                });
            }
        });
    }

    if (canBlockOrFlag) {
        if (comment.isBlocked) {
            menuItems.push({
                id: 'unblock',
                label: state.translations.COMMENT_MENU_UNBLOCK_USER.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BLOCK_WHITE : FastCommentsImageAsset.ICON_BLOCK].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'block',
                label: state.translations.COMMENT_MENU_BLOCK_USER.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BLOCK_WHITE : FastCommentsImageAsset.ICON_BLOCK].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, true);
                }
            });
        }
    }

    if (canBlockOrFlag) {
        if (comment.isFlagged) {
            menuItems.push({
                id: 'unflag',
                label: state.translations.COMMENT_MENU_UNFLAG.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BLOCK_WHITE : FastCommentsImageAsset.ICON_BLOCK].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'flag',
                label: state.translations.COMMENT_MENU_FLAG.get(),
                icon: <Image
                    source={state.imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_BLOCK_WHITE : FastCommentsImageAsset.ICON_BLOCK].get()}
                    style={styles.commentMenu?.itemIcon}/>,
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, true);
                }
            });
        }
    }

    return menuItems;
}
