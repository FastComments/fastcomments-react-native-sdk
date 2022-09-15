// @ts-ignore TODO remove
import * as React from 'react';
import {Dispatch, SetStateAction} from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types/image-asset";
import {Image} from "react-native";
import {createURLQueryString, makeRequest} from "../services/http";
import {GetCommentTextResponse} from "../types/dto/get-comment-text";
import {CommentActionEdit} from './comment-action-edit';
import {CommentPromptDelete} from "./comment-action-delete";
import {repositionComment} from "../services/comment-positioning";
import {PinCommentResponse} from "../types/dto/pin-comment";
import {BlockCommentResponse} from "../types/dto/block-comment";
import {ModalMenuItem} from "./modal-menu";
import {State} from "@hookstate/core";
import {FastCommentsState, RNComment} from "../types";

async function startEditingComment({
                                       state,
                                       comment
                                   }: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'GET',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/text${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey.get()
        })}`
    });
    console.log('got response', response);
    if (response.status === 'success') {
        comment.comment.set(response.commentText);
        setModalId('edit');
    } else {
        // TODO show error
    }
}

async function setCommentPinStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doPin: boolean) {
    const response = await makeRequest<PinCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/${doPin ? 'pin' : 'unpin'}${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey.get()
        })}`
    });
    if (response.status === 'success') {
        comment.isPinned.set(doPin);
        repositionComment(comment._id.get(), response.commentPositions!, state);
    } else {
        // TODO show error
    }
}

async function setCommentBlockedStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doBlock: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: doBlock ? 'POST' : 'DELETE',
        url: `/block-from-comment/${comment._id.get()}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            editKey: comment.editKey.get()
        })}`,
        body: {
            commentIds: Object.keys(state.commentsById.get())
        }
    });
    if (response.status === 'success') {
        comment.isBlocked.set(doBlock);
        for (const otherCommentId in response.commentStatuses) {
            if (state.commentsById[otherCommentId].get()) {
                const existing = !!state.commentsById[otherCommentId].isBlocked.get();
                const newValue = response.commentStatuses[otherCommentId];
                if (existing !== newValue) {
                    state.commentsById[otherCommentId].isBlocked.set(newValue);
                }
            }
        }
    } else {
        // TODO show error
    }
}

async function setCommentFlaggedStatus({state, comment}: Pick<FastCommentsCommentWithState, 'state' | 'comment'>, doFlag: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/flag-comment/${comment._id.get()}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            isFlagged: doFlag
        })}`
    });
    if (response.status === 'success') {
        comment.isFlagged.set(doFlag);
    } else {
        // TODO show error
        // response.translatedError is supported here (but why not in all actions?)
    }
}

interface CommentMenuState {
    canEdit: boolean
    canPin: boolean
    canBlockOrFlag: boolean
}

export function getCommentMenuState(state: State<FastCommentsState>, comment: State<RNComment>): CommentMenuState {
    const currentUser = state.currentUser.get({stealth: true});
    const isMyComment = !!currentUser && 'id' in currentUser && (comment.userId.get({stealth: true}) === currentUser.id || comment.anonUserId.get({stealth: true}) === currentUser.id);
    const canEdit: boolean = !comment.isDeleted.get({stealth: true}) && !!((currentUser && 'authorized' in currentUser && !!currentUser.authorized && (state.isSiteAdmin.get({stealth: true}) || isMyComment))); // can have edit key and be anon
    const canPin: boolean = state.isSiteAdmin.get({stealth: true}) && !(comment.parentId?.get({stealth: true}));
    const canBlockOrFlag: boolean = !comment.isDeleted?.get({stealth: true}) && !comment.isByAdmin?.get({stealth: true}) && !comment.isByModerator?.get({stealth: true}) && !isMyComment && !!currentUser && 'authorized' in currentUser && !!currentUser.authorized;
    return {
        canEdit,
        canPin,
        canBlockOrFlag
    }
}

export function getCommentMenuItems({comment, styles, state}: FastCommentsCommentWithState, {
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
        if (comment.isPinned.get()) {
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
                    styles,
                    close: () => setModalId(null)
                });
            }
        });
    }

    if (canBlockOrFlag) {
        if (comment.isBlocked.get()) {
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
        if (comment.isFlagged.get()) {
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
