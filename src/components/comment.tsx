// @ts-ignore TODO remove
import * as React from 'react';
import {useState} from 'react';

import RenderHtml from 'react-native-render-html';

import {FastCommentsState} from "../types/fastcomments-state";
import {Image, StyleSheet, Text, useWindowDimensions, View} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {ReplyArea} from "./reply-area";
import {FastCommentsWidgetComment} from 'fastcomments-typescript';
import {getDisplayDate} from "../services/comment-date";
import {State} from "@hookstate/core";
import {FastCommentsIconType} from "../types/icon";

export interface FastCommentsCommentWithState {
    comment: State<FastCommentsWidgetComment>;
    state: State<FastCommentsState>;
}

export function FastCommentsCommentView(commentWithState: FastCommentsCommentWithState) {
    const {comment, state} = commentWithState;
    // const isMyComment = state.currentUser && 'id' in state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);

    console.log('is deleted?', comment.isDeleted.get());

    const html = comment.isDeleted.get()
        ? state.translations.DELETED_PLACEHOLDER.get()
        : (
            comment.isBlocked.get()
                ? state.translations.YOU_BLOCKED_THIS_USER.get()
                : comment.commentHTML.get()
        );

    const dateObj = new Date(comment.date.get());
    const [displayDate, setDisplayDate] = useState(getDisplayDate(state.config.get(), state.translations.get(), dateObj));

    // Technically having a separate timer per comment is not optimal. But, JS timers are very light and we'll only render 30 comments most of the time.
    // It would be cool to have only one timer, like in the VanillaJS library.
    setInterval(function() {
        setDisplayDate(getDisplayDate(state.config.get(), state.translations.get(), dateObj));
    }, 60_000);

    const { width } = useWindowDimensions();

    return <View>
        <View style={styles.topRight}>
            {comment.isPinned.get() && <Image source={state.icons.get()[FastCommentsIconType.PIN_RED]} style={{width: 24, height: 24}} />}
            {!(state.config.readonly.get()) && CommentMenu(commentWithState)}
        </View>
        <CommentNotices comment={comment} state={state}/>
        <CommentUserInfo comment={comment} state={state}/>
        <Text>{displayDate}</Text>
        <RenderHtml source={{html}} contentWidth={width}/>
        <View style={styles.commentBottom}>
            <View style={styles.commentBottomToolbar}>
                <View style={styles.commentBottomToolbarVote}>

                </View>
                <View style={styles.commentBottomToolbarReply}>

                </View>
            </View>
            {state.commentState[comment._id.get()]?.replyBoxOpen && ReplyArea(commentWithState.state)}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    topRight: {
        position: "absolute",
        top: 0,
        right: 0
    },
    pin: {},
    userInfo: {},
    commentBottom: {},
    commentBottomToolbar: {},
    commentBottomToolbarVote: {},
    commentBottomToolbarReply: {},
})
