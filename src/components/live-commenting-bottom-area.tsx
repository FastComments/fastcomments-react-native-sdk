// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {State, useHookstate} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";
import {RNComment} from "../types";
import {useState} from "react";

export interface LiveCommentingTopAreaProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
    callbackObserver: CallbackObserver
}

export interface CallbackObserver {
    replyingTo?: (comment: RNComment | null) => void
}

export function LiveCommentingBottomArea(props: LiveCommentingTopAreaProps) {
    const {styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const [parentComment, setParentComment] = useState<State<RNComment> | null>();

    props.callbackObserver.replyingTo = (comment) => {
        if (comment) {
            const commentState = state.commentsById[comment._id];
            setParentComment(commentState);
        } else {
            setParentComment(null);
        }
    }

    return <View style={props.styles.bottomArea?.root}>
        <View>{
            state.config.inputAfterComments.get() &&
            <View style={props.styles.bottomArea?.replyArea}>
                <ReplyArea state={state} styles={styles} parentComment={parentComment} replyingTo={props.callbackObserver.replyingTo}/>
            </View>
        }</View>
    </View>;
}
