// @ts-ignore TODO remove
import * as React from 'react';
import {useState} from 'react';

import RenderHtml from 'react-native-render-html';

import {FastCommentsState} from "../types/fastcomments-state";
import {Image, Pressable, StyleSheet, Text, useWindowDimensions, View} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {ReplyArea} from "./reply-area";
import {FastCommentsWidgetComment} from 'fastcomments-typescript';
import {getDisplayDate} from "../services/comment-date";
import {State} from "@hookstate/core";
import {FastCommentsImageAsset} from "../types/image-asset";

export interface FastCommentsCommentWithState {
    comment: State<FastCommentsWidgetComment>;
    state: State<FastCommentsState>;
}

function setReplyBoxOpen(state: State<FastCommentsState>, commentId: string, isOpen: boolean) {
    if (!state.commentState[commentId]?.get()) {
        state.commentState.set((commentState) => {
            if (!commentState[commentId]) {
                commentState[commentId] = {
                    replyBoxOpen: isOpen
                }
            } else {
                commentState[commentId].replyBoxOpen = isOpen;
            }
            return {...commentState};
        })
    } else {
        state.commentState[commentId].merge({
            replyBoxOpen: isOpen
        });
    }
}

export function FastCommentsCommentView(commentWithState: FastCommentsCommentWithState) {
    const {comment, state} = commentWithState;
    // const isMyComment = state.currentUser && 'id' in state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);

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
    setInterval(function () {
        setDisplayDate(getDisplayDate(state.config.get(), state.translations.get(), dateObj));
    }, 60_000);

    const {width} = useWindowDimensions();
    const isReplyBoxOpen = state.commentState[comment._id.get()]?.replyBoxOpen?.get();

    // @ts-ignore
    return <View>
        <View style={styles.topRight}>
            {comment.isPinned.get() && <Image source={state.imageAssets[FastCommentsImageAsset.ICON_PIN_RED].get()} style={{width: 24, height: 24}}/>}
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
                <Pressable style={styles.commentBottomToolbarReply} onPress={() => setReplyBoxOpen(state, comment._id.get(), !isReplyBoxOpen)}>
                    <Image
                        source={state.imageAssets[isReplyBoxOpen ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE].get()}
                        style={{width: 15, height: 15}}/>
                    <Text style={styles.commentBottomToolbarReplyText}>{state.translations.REPLY.get()}</Text>
                </Pressable>
            </View>
            {isReplyBoxOpen && <ReplyArea state={state} parentComment={comment}/>}
        </View>
        <View style={styles.children}>
            {/* TODO how to fix stupid cast here? */}
            {comment.children?.get() && (comment.children as State<FastCommentsWidgetComment[]>).map((comment) =>
                <FastCommentsCommentView comment={comment} state={state} key={comment._id.get()}/>
            )}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    topRight: {
        position: "absolute",
        top: 0,
        right: 0,
        zIndex: 1
    },
    pin: {},
    userInfo: {},
    commentBottom: {},
    commentBottomToolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    commentBottomToolbarVote: {},
    commentBottomToolbarReply: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    commentBottomToolbarReplyText: {
        marginLeft: 3
    },
    children: {
        "marginTop": 15,
        "marginRight": 0,
        "marginBottom": 0,
        "marginLeft": 15
    },
})
