// @ts-ignore TODO remove
import * as React from 'react';

import DropDownPicker from 'react-native-dropdown-picker';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsIconType} from "../types/icon";
import {useState} from "react";
import {resolveIcon} from "../services/icons";

async function startEditingComment(_props: FastCommentsCommentWithState) {
    // makeRequest(config, 'GET', '/comments/' + tenantIdToUse + '/' + commentId + '/text' + createURLQueryString({
    //     sso: ssoConfigString,
    //     editKey: commentsById[commentId].editKey
    // }), null, function (response) {
    //     if (response.status === 'success') {
    //         // set the comment as being edited
    //         commentsEditingById[commentId] = isEditing;
    //         commentsById[commentId].comment = response.commentText;
    //
    //         delete commentsById[commentId].editFailure; // TODO DEPRECATE FOR COMMON ERR HANDLING
    //         delete commentsById[commentId].editFailureExpiration; // TODO DEPRECATE FOR COMMON ERR HANDLING
    //
    //         // re-render it
    //         reRenderComment(commentsById[commentId]);
    //         setTimeout(function () {
    //             const textarea = getElementById('input-for-parent-' + commentId);
    //             if (textarea && textarea.scrollHeight > 0) {
    //                 textarea.style.height = (textarea.scrollHeight + 10) + 'px';
    //             }
    //         }, 10);
    //     } else {
    //         commentsById[commentId].errorMessage = translations.ERROR_MESSAGE;
    //         reRenderComment(commentsById[commentId]);
    //     }
    // }, function () {
    //     commentsById[commentId].errorMessage = translations.ERROR_MESSAGE;
    //     reRenderComment(commentsById[commentId]);
    // });
}

async function setCommentPinStatus(_props: FastCommentsCommentWithState, _doPin: boolean) {

}

async function setCommentBlockedStatus(_props: FastCommentsCommentWithState, _doBlock: boolean) {

}

async function setCommentFlaggedStatus(_props: FastCommentsCommentWithState, _doFlag: boolean) {

}

export function CommentMenu(props: FastCommentsCommentWithState) {
    const {comment, state} = props;
    const currentUser = state.currentUser;
    const isMyComment = currentUser && 'id' in currentUser && (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    const canEdit = !comment.isDeleted && ((currentUser && 'authorized' in currentUser && currentUser.authorized && (state.isSiteAdmin || isMyComment)) || (state.commentState[comment._id]?.isEditing)); // can have edit key and be anon
    const canPin = state.isSiteAdmin && !comment.parentId;
    const canBlockOrFlag = !comment.isDeleted && !comment.isByAdmin && !comment.isByModerator && !isMyComment && currentUser && 'authorized' in currentUser && currentUser.authorized;

    const menuItems = [];

    if (canEdit) {
        menuItems.push({
            label: props.state.translations.COMMENT_MENU_EDIT,
            value: 'edit',
            icon: resolveIcon(state.icons, FastCommentsIconType.EDIT_BIG)
        });
    }

    if (canPin) {
        if (props.comment.isPinned) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNPIN,
                value: 'unpin',
                icon: resolveIcon(state.icons, FastCommentsIconType.UNPIN_BIG)
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_PIN,
                value: 'pin',
                icon: resolveIcon(state.icons, FastCommentsIconType.PIN_BIG)
            });
        }
    }

    if (canEdit) {
        menuItems.push({
            label: props.state.translations.COMMENT_MENU_DELETE,
            value: 'delete',
            icon: resolveIcon(state.icons, FastCommentsIconType.TRASH)
        });
    }

    if (canBlockOrFlag) {
        if (props.comment.isBlocked) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNBLOCK_USER,
                value: 'unblock',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK)
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_BLOCK_USER,
                value: 'block',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK)
            });
        }
    }

    if (canBlockOrFlag) {
        if (props.comment.isFlagged) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNFLAG,
                value: 'unflag',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK)
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_FLAG,
                value: 'flag',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK)
            });
        }
    }

    const [open, setOpen] = useState(false);
    const [items, setItems] = useState(menuItems);

    const setValue = (newValue: any) => {
        switch (newValue) {
            case 'edit':
                // noinspection JSIgnoredPromiseFromCall
                startEditingComment(props);
                break;
            case 'unpin':
                // noinspection JSIgnoredPromiseFromCall
                setCommentPinStatus(props, false);
                break;
            case 'pin':
                // noinspection JSIgnoredPromiseFromCall
                setCommentPinStatus(props, true);
                break;
            case 'delete':
                break;
            case 'unblock':
                // noinspection JSIgnoredPromiseFromCall
                setCommentBlockedStatus(props, false);
                break;
            case 'block':
                // noinspection JSIgnoredPromiseFromCall
                setCommentBlockedStatus(props, true);
                break;
            case 'unflag':
                // noinspection JSIgnoredPromiseFromCall
                setCommentFlaggedStatus(props, false);
                break;
            case 'flag':
                // noinspection JSIgnoredPromiseFromCall
                setCommentFlaggedStatus(props, true);
                break;
        }
    };

    return (
        <DropDownPicker
            open={open}
            value={null}
            items={items}
            setOpen={setOpen}
            setValue={setValue}
            setItems={setItems}
        />
    );
}
