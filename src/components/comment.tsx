// @ts-ignore TODO remove
import * as React from 'react';
import {useState} from 'react';

import RenderHtml from 'react-native-render-html';

import {FastCommentsState} from "../types/fastcomments-state";
import {Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {ReplyArea} from "./reply-area";
import {FastCommentsWidgetComment} from 'fastcomments-typescript';
import {getDisplayDate} from "../services/comment-date";
import {State, useHookstate} from "@hookstate/core";
import {FastCommentsImageAsset} from "../types/image-asset";
import {CommentVote} from './comment-vote';
import {CommentReplyToggle} from "./comment-reply-toggle";

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
    const comment = commentWithState.comment;
    const state = useHookstate(commentWithState.state); // creating scoped state
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
    const commentState = state.commentState[comment._id.get()]?.get();
    const isReplyBoxOpen = commentState?.replyBoxOpen;
    const repliesHidden = commentState?.repliesHidden;

    return <View style={styles.root}>
        <View style={styles.topRight}>
            <Text style={styles.displayDate}>{displayDate}</Text>
            {comment.isPinned.get() && <Image source={state.imageAssets[FastCommentsImageAsset.ICON_PIN_RED].get()} style={styles.pin}/>}
            {!(state.config.readonly.get()) && CommentMenu(commentWithState)}
        </View>
        <CommentNotices comment={comment} state={state}/>
        <CommentUserInfo comment={comment} state={state}/>
        <RenderHtml source={{html}} contentWidth={width} baseStyle={styles.contentWrapper}/>
        <View style={styles.commentBottom}>
            <View style={styles.commentBottomToolbar}>
                <CommentVote comment={comment} state={state}/>
                <TouchableOpacity style={styles.commentBottomToolbarReply} onPress={() => setReplyBoxOpen(state, comment._id.get(), !isReplyBoxOpen)}>
                    <Image
                        source={state.imageAssets[isReplyBoxOpen ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE].get()}
                        style={{width: 15, height: 15}}/>
                    <Text style={styles.commentBottomToolbarReplyText}>{state.translations.REPLY.get()}</Text>
                </TouchableOpacity>
            </View>
            {isReplyBoxOpen && <ReplyArea state={state} parentComment={comment}/>}
            <CommentReplyToggle comment={comment} state={state} />
        </View>
        {
            !repliesHidden && <View style={styles.children}>
                {/* TODO how to fix stupid cast here? */}
                {comment.children?.get() && (comment.children as State<FastCommentsWidgetComment[]>).map((comment) =>
                    <FastCommentsCommentView comment={comment} state={state} key={comment._id.get()}/>
                )}
            </View>
        }
    </View>;
}

const styles = StyleSheet.create({
    root: {},
    topRight: {
        position: "absolute",
        flexDirection: 'row',
        // alignItems: 'center',
        justifyContent: 'flex-end',
        top: 0,
        right: 0,
        zIndex: 1
    },
    displayDate: {
        alignSelf: 'center',
        fontSize: 12,
        textAlignVertical: 'center',
    },
    pin: {
        alignSelf: 'center',
        width: 18,
        height: 18,
    },
    userInfo: {},
    contentWrapper: {
        marginLeft: 5,
        marginTop: 10,
        fontSize: 13
    },
    commentBottom: {
        marginTop: 10,
        marginLeft: 5
    },
    commentBottomToolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    commentBottomToolbarReply: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    commentBottomToolbarReplyText: {
        marginLeft: 5
    },
    children: {
        "marginTop": 15,
        "marginRight": 0,
        "marginBottom": 0,
        "marginLeft": 15
    },
})
