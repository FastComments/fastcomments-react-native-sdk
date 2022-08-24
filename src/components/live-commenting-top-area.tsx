// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {SelectSortDirection} from "./select-sort-direction";
import {ShowNewLiveCommentsButton} from "./show-new-live-comments-button";
import {State} from "@hookstate/core";

export interface LiveCommentingTopAreaProps {
    state: State<FastCommentsState>;
}

export function LiveCommentingTopArea({state}: LiveCommentingTopAreaProps) {
    return <View>
        <View>{
            state.config.inputAfterComments.get() !== true && ReplyArea({state})
        }</View>
        <View>{
            state.config.useShowCommentsToggle.get() && state.commentCountOnServer.get() > 0 && ShowHideCommentsToggle(state)
        }</View>
        <View>{
            state.commentsVisible.get() && state.commentCountOnServer.get() > 1 && SelectSortDirection(state)
        }</View>
        <View>{
            state.commentsVisible.get() && state.newRootCommentCount.get() > 1 && ShowNewLiveCommentsButton(state)
        }</View>
    </View>;
}

// const styles = StyleSheet.create({
//
// });
