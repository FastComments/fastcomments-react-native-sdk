import RenderHtml from 'react-native-render-html';

// This is a subset of the API comment object.
import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, View} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {FastCommentsComment} from "../types/comment";
import {ReplyArea} from "./reply-area";

export interface FastCommentsCommentWithState {
    comment: FastCommentsComment;
    state: FastCommentsState;
}

export function FastCommentsCommentView(commentWithState: FastCommentsCommentWithState) {
    const {comment, state} = commentWithState;
    const isMyComment = state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);

    const html = comment.isDeleted
        ? state.translations.DELETED_PLACEHOLDER
        : (
            comment.isBlocked
                ? state.translations.YOU_BLOCKED_THIS_USER
                : comment.commentHTML
        );

    return <View>
        <View style={styles.topRight}>
            {comment.isPinned && <View style={styles.pin}/>}
            {!state.config.readonly && CommentMenu(commentWithState)}
        </View>
        <CommentNotices comment={comment} state={state}/>
        <CommentUserInfo comment={comment} state={state}/>
        <RenderHtml source={{html}}/>
        <View style={styles.commentBottom}>
            <View style={styles.commentBottomToolbar}>
                <View style={styles.commentBottomToolbarVote}>

                </View>
                <View style={styles.commentBottomToolbarReply}>

                </View>
            </View>
            {state.commentState[comment._id]?.replyBoxOpen && ReplyArea(commentWithState)}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    topRight: {},
    pin: {},
    userInfo: {},
    commentBottom: {},
    commentBottomToolbar: {},
    commentBottomToolbarVote: {},
    commentBottomToolbarReply: {},
})
