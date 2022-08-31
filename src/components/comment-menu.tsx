// @ts-ignore TODO remove
import * as React from 'react';
import {Dispatch, SetStateAction} from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types/image-asset";
import {Image, View} from "react-native";
import {createURLQueryString, makeRequest} from "../services/http";
import {GetCommentTextResponse} from "../types/dto/get-comment-text";
import {CommentActionEdit} from './comment-action-edit';
import {CommentPromptDelete} from "./comment-action-delete";
import {repositionComment} from "../services/comment-positioning";
import {PinCommentResponse} from "../types/dto/pin-comment";
import {BlockCommentResponse} from "../types/dto/block-comment";
import {ModalMenu, ModalMenuItem} from "./modal-menu";

async function startEditingComment({state, comment}: FastCommentsCommentWithState, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'GET',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/text${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get()
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

async function setCommentPinStatus({state, comment}: FastCommentsCommentWithState, doPin: boolean) {
    const response = await makeRequest<PinCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/${doPin ? 'pin' : 'unpin'}${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get()
        })}`
    });
    if (response.status === 'success') {
        comment.isPinned.set(doPin);
        repositionComment(comment._id.get(), response.commentPositions!, state);
    } else {
        // TODO show error
    }
}

async function setCommentBlockedStatus({state, comment}: FastCommentsCommentWithState, doBlock: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: doBlock ? 'POST' : 'DELETE',
        url: `/block-from-comment/${comment._id.get()}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get()
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

async function setCommentFlaggedStatus({state, comment}: FastCommentsCommentWithState, doFlag: boolean) {
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

export function CommentMenu({comment, state}: FastCommentsCommentWithState) {
    const currentUser = state.currentUser.get();
    const isMyComment = currentUser && 'id' in currentUser && (comment.userId.get() === currentUser.id || comment.anonUserId.get() === currentUser.id);
    // console.log('isMyComment', isMyComment, currentUser, comment.userId.get(), comment.anonUserId.get(), state.isSiteAdmin.get()); // TODO REMOVE
    const canEdit = !comment.isDeleted.get() && ((currentUser && 'authorized' in currentUser && currentUser.authorized && (state.isSiteAdmin.get() || isMyComment))); // can have edit key and be anon
    const canPin = state.isSiteAdmin.get() && !(comment.parentId?.get());
    const canBlockOrFlag = !comment.isDeleted?.get() && !comment.isByAdmin?.get() && !comment.isByModerator?.get() && !isMyComment && currentUser && 'authorized' in currentUser && currentUser.authorized;

    const menuItems: ModalMenuItem[] = []; // creating an array for every comment rendered is not ideal

    if (canEdit) {
        menuItems.push({
            id: 'edit',
            label: state.translations.COMMENT_MENU_EDIT.get(),
            icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_EDIT_BIG].get()} style={{width: 24, height: 24}}/>,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await startEditingComment({comment, state}, setModalId);
            },
            subModalContent: (close: () => void) => <CommentActionEdit comment={comment} state={state} close={close}/>
        });
    }

    if (canPin) {
        if (comment.isPinned.get()) {
            menuItems.push({
                id: 'unpin',
                label: state.translations.COMMENT_MENU_UNPIN.get(),
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_UNPIN_BIG].get()} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentPinStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'pin',
                label: state.translations.COMMENT_MENU_PIN.get(),
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_PIN_BIG].get()} style={{width: 24, height: 24}}/>,
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
            icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_TRASH].get()} style={{width: 24, height: 24}}/>,
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
        if (comment.isBlocked.get()) {
            menuItems.push({
                id: 'unblock',
                label: state.translations.COMMENT_MENU_UNBLOCK_USER.get(),
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BLOCK].get()} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'block',
                label: state.translations.COMMENT_MENU_BLOCK_USER.get(),
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BLOCK].get()} style={{width: 24, height: 24}}/>,
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
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BLOCK].get()} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                id: 'flag',
                label: state.translations.COMMENT_MENU_FLAG.get(),
                icon: <Image source={state.imageAssets[FastCommentsImageAsset.ICON_BLOCK].get()} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, true);
                }
            });
        }
    }

    if (menuItems.length === 0) {
        return null;
    }

    const openButton = <View style={{padding: 5}}><Image source={state.imageAssets[FastCommentsImageAsset.ICON_EDIT_SMALL].get()} style={{width: 16, height: 16}}/></View>;

    return <ModalMenu state={state} items={menuItems} openButton={openButton} />;
}
