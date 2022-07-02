import {Menu, MenuOption, MenuOptions, MenuTrigger,} from 'react-native-popup-menu';
import {Text} from 'react-native';

import {FastCommentsCommentWithState} from "./comment";
import {Icon} from "./icon";
import {FastCommentsIconType} from "../types/icon";

async function startEditingComment(props: FastCommentsCommentWithState) {
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

async function setCommentPinStatus(props: FastCommentsCommentWithState, doPin: boolean) {

}

async function setCommentBlockedStatus(props: FastCommentsCommentWithState, doBlock: boolean) {

}

async function setCommentFlaggedStatus(props: FastCommentsCommentWithState, doFlag: boolean) {

}

export function CommentMenu(props: FastCommentsCommentWithState) {
    const {comment, state} = props;
    const currentUser = state.currentUser;
    const isMyComment = currentUser && (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    const canEdit = !comment.isDeleted && ((currentUser && currentUser.authorized && (state.isSiteAdmin || isMyComment)) || (state.commentState[comment._id]?.isEditing)); // can have edit key and be anon
    const canPin = state.isSiteAdmin && !comment.parentId;
    const canBlockOrFlag = !comment.isDeleted && !comment.isByAdmin && !comment.isByModerator && !isMyComment && currentUser && currentUser.authorized;

    const editOption = canEdit ? <MenuOption onSelect={() => startEditingComment(props)}>
        <Icon iconConfig={state.icons} type={FastCommentsIconType.EDIT_BIG}/><Text>{props.state.translations.COMMENT_MENU_EDIT}</Text>
    </MenuOption> : null;

    const pinOption = canPin ? (props.comment.isPinned ?
        <MenuOption onSelect={() => setCommentPinStatus(props, false)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.UNPIN_BIG}/><Text>{props.state.translations.COMMENT_MENU_UNPIN}</Text>
        </MenuOption>
        : <MenuOption onSelect={() => setCommentPinStatus(props, true)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.PIN_BIG}/><Text>{props.state.translations.COMMENT_MENU_PIN}</Text>
        </MenuOption>) : null;

    const deleteOption = canEdit ? <MenuOption onSelect={() => startEditingComment(props)}>
        <Icon iconConfig={state.icons} type={FastCommentsIconType.TRASH}/><Text>{props.state.translations.COMMENT_MENU_DELETE}</Text>
    </MenuOption> : null;

    const blockOption = canBlockOrFlag ? (props.comment.isBlocked ?
        <MenuOption onSelect={() => setCommentBlockedStatus(props, false)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.BLOCK}/><Text>{props.state.translations.COMMENT_MENU_UNBLOCK_USER}</Text>
        </MenuOption>
        : <MenuOption onSelect={() => setCommentBlockedStatus(props, true)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.BLOCK}/><Text>{props.state.translations.COMMENT_MENU_BLOCK_USER}</Text>
        </MenuOption>) : null;

    const flagOption = canBlockOrFlag ? (props.comment.isFlagged ?
        <MenuOption onSelect={() => setCommentFlaggedStatus(props, false)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.BLOCK}/><Text>{props.state.translations.COMMENT_MENU_UNFLAG}</Text>
        </MenuOption>
        : <MenuOption onSelect={() => setCommentFlaggedStatus(props, true)}>
            <Icon iconConfig={state.icons} type={FastCommentsIconType.BLOCK}/><Text>{props.state.translations.COMMENT_MENU_FLAG}</Text>
        </MenuOption>) : null;

    return <Menu>
        <MenuTrigger text='Select action'/>
        <MenuOptions>
            {editOption}
            {pinOption}
            {deleteOption}
            {blockOption}
            {flagOption}
        </MenuOptions>
    </Menu>;
}
