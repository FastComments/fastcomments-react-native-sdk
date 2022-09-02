// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {Image, TouchableOpacity, View, Text} from "react-native";
import {CommentVote} from "./comment-vote";
import {FastCommentsImageAsset, FastCommentsCallbacks} from "../types";
import {CommentReplyToggle} from "./comment-reply-toggle";
import {useState} from "react";
import {ReplyArea} from "./reply-area";

export interface CommentBottomProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange'> {
    repliesHiddenState: State<boolean>
}

export function CommentBottom(props: CommentBottomProps) {
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const {comment, styles, onVoteSuccess, onReplySuccess, onAuthenticationChange} = props;
    // OPTIMIZATION: we only use comment.replyBoxOpen for initial render.
    // TODO This is still not great, because now replyBoxOpen is out of date. Is there a way to use comment.replyBoxOpen.set() without re-rendering all comment objects?
    const [isReplyBoxOpen, setIsReplyBoxOpen] = useState(comment.replyBoxOpen.get());

    useHookstateEffect(() => {
        setIsReplyBoxOpen(comment.replyBoxOpen.get()); // for when replyarea changes value
    }, [comment.replyBoxOpen]);

    return <View style={styles.commentBottom?.root}>
        <View style={styles.commentBottom?.commentBottomToolbar}>
            <CommentVote comment={comment} state={state} styles={styles} onVoteSuccess={onVoteSuccess}/>
            <TouchableOpacity style={styles.commentBottom?.commentBottomToolbarReply} onPress={() => setIsReplyBoxOpen(!isReplyBoxOpen)}>
                <Image
                    source={state.imageAssets[isReplyBoxOpen ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE].get()}
                    style={{width: 15, height: 15}}/>
                <Text style={styles.commentBottom?.commentBottomToolbarReplyText}>{state.translations.REPLY.get()}</Text>
            </TouchableOpacity>
        </View>
        {isReplyBoxOpen && <View style={styles.commentBottom?.replyAreaRoot}><ReplyArea state={state} parentComment={comment} styles={styles} onReplySuccess={onReplySuccess} onAuthenticationChange={onAuthenticationChange}/></View>}
        <CommentReplyToggle comment={comment} state={state} styles={styles} repliesHiddenState={props.repliesHiddenState} />
    </View>;
}
