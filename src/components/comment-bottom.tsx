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
import {CommentDisplayDate} from "./comment-dispay-date";

export interface CommentBottomProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo'> {
    repliesHiddenState: State<boolean>
}

export function CommentBottom(props: CommentBottomProps) {
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const {comment, styles, onVoteSuccess, onReplySuccess, onAuthenticationChange, replyingTo} = props;
    // OPTIMIZATION: we only use comment.replyBoxOpen for initial render.
    // TODO This is still not great, because now replyBoxOpen is out of date. Is there a way to use comment.replyBoxOpen.set() without re-rendering all comment objects?
    const [isReplyBoxOpen, setIsReplyBoxOpen] = useState(comment.replyBoxOpen.get());

    useHookstateEffect(() => {
        setIsReplyBoxOpen(comment.replyBoxOpen.get()); // for when replyarea changes value
    }, [comment.replyBoxOpen]);

    return <View style={styles.commentBottom?.root}>
        <View style={styles.commentBottom?.commentBottomToolbar}>
            {state.config.renderDateBelowComment.get() && <CommentDisplayDate comment={comment} state={state} style={styles.comment?.displayDate} styles={styles}/>}
            {!state.config.renderLikesToRight.get() && <CommentVote comment={comment} state={state} styles={styles} onVoteSuccess={onVoteSuccess}/>}
            <TouchableOpacity style={styles.commentBottom?.commentBottomToolbarReply} onPress={() => {
                if (state.config.useSingleReplyField.get()) {
                    // We always expect the callback to exist in this case. Otherwise is an error.
                    replyingTo!(isReplyBoxOpen ? null : comment.get()); // if reply box already open, invoke with null to say we're not replying.
                    setIsReplyBoxOpen(!isReplyBoxOpen);
                } else {
                    replyingTo && replyingTo(comment.get());
                    setIsReplyBoxOpen(!isReplyBoxOpen);
                }
            }
            }>
                <Image
                    source={state.imageAssets[isReplyBoxOpen ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE].get()}
                    style={styles.commentBottom?.commentBottomToolbarReplyIcon}/>
                <Text style={styles.commentBottom?.commentBottomToolbarReplyText}>{state.translations.REPLY.get()}</Text>
            </TouchableOpacity>
        </View>
        {isReplyBoxOpen && !state.config.useSingleReplyField.get() && <View style={styles.commentBottom?.replyAreaRoot}><ReplyArea state={state} parentComment={comment} styles={styles} onReplySuccess={onReplySuccess} onAuthenticationChange={onAuthenticationChange}/></View>}
        <CommentReplyToggle comment={comment} state={state} styles={styles} repliesHiddenState={props.repliesHiddenState} />
    </View>;
}
