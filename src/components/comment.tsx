import RenderHtml from 'react-native-render-html';

// This is a subset of the API comment object.
import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, View, Text} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {ReplyArea} from "./reply-area";
import {useState} from "react";
import { FastCommentsWidgetComment } from 'fastcomments-typescript';
import {getDisplayDate} from "../services/comment-date";

export interface FastCommentsCommentWithState {
    comment: FastCommentsWidgetComment;
    state: FastCommentsState;
}

export function FastCommentsCommentView(commentWithState: FastCommentsCommentWithState) {
    const {comment, state} = commentWithState;
    const isMyComment = state.currentUser && 'id' in state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);

    const html = comment.isDeleted
        ? state.translations.DELETED_PLACEHOLDER
        : (
            comment.isBlocked
                ? state.translations.YOU_BLOCKED_THIS_USER
                : comment.commentHTML
        );

    const dateObj = new Date(comment.date);
    const [displayDate, setDisplayDate] = useState(getDisplayDate(state.config, state.translations, dateObj));

    // Technically having a separate timer per comment is not optimal. But, JS timers are very light and we'll only render 30 comments most of the time.
    // It would be cool to have only one timer, like in the VanillaJS library.
    setInterval(function() {
        setDisplayDate(getDisplayDate(state.config, state.translations, dateObj));
    }, 60_000);

    return <View>
        <View style={styles.topRight}>
            {comment.isPinned && <View style={styles.pin}/>}
            {!state.config.readonly && CommentMenu(commentWithState)}
        </View>
        <CommentNotices comment={comment} state={state}/>
        <CommentUserInfo comment={comment} state={state}/>
        <Text>{displayDate}</Text>
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
