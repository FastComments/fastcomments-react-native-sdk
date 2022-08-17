// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {SelectSortDirection} from "./select-sort-direction";
import {ShowNewLiveCommentsButton} from "./show-new-live-comments-button";

export function LiveCommentingTopArea(state: FastCommentsState) {
    return <View>
        <View>{
            state.config.inputAfterComments !== true && ReplyArea(state)
        }</View>
        <View>{
            state.config.useShowCommentsToggle && state.commentCountOnServer > 0 && ShowHideCommentsToggle(state)
        }</View>
        <View>{
            state.commentsVisible && state.commentCountOnServer > 1 && SelectSortDirection(state)
        }</View>
        <View>{
            state.commentsVisible && state.newRootCommentCount > 1 && ShowNewLiveCommentsButton(state)
        }</View>
    </View>;
}

// const styles = StyleSheet.create({
//
// });
