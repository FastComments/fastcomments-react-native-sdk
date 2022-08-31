// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, View} from "react-native";
import {ReplyArea} from "./reply-area";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {SelectSortDirection} from "./select-sort-direction";
import {ShowNewLiveCommentsButton} from "./show-new-live-comments-button";
import {State, useHookstate} from "@hookstate/core";
import { CommentCount } from './comment-count';

export interface LiveCommentingTopAreaProps {
    state: State<FastCommentsState>;
}

export function LiveCommentingTopArea(props: LiveCommentingTopAreaProps) {
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const areCommentsVisible = state.commentsVisible.get();
    const serverCommentCount = state.commentCountOnServer.get();
    return <View>
        <View>{
            state.config.inputAfterComments.get() !== true && <View style={styles.replyArea}><ReplyArea state={state}/></View>
        }</View>
        <View>{
            state.config.useShowCommentsToggle.get() && serverCommentCount > 0 && ShowHideCommentsToggle(state)
        }</View>
        {
            areCommentsVisible && serverCommentCount > 0
            && <View style={styles.separator}>
                <CommentCount style={styles.commentCount} state={state} count={serverCommentCount}/>
                {
                    areCommentsVisible && serverCommentCount > 1 && <View>{SelectSortDirection(state)}</View>
                }
            </View>
        }
        <View>{
            areCommentsVisible && state.newRootCommentCount.get() > 1 && ShowNewLiveCommentsButton(state)
        }</View>
    </View>;
}

const styles = StyleSheet.create({
    replyArea: {
        "marginTop": 15,
        "marginRight": 15,
        "marginLeft": 15
    },
    separator: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 5,
        paddingLeft: 10,
        paddingRight: 10,
        borderBottomWidth: 1,
        borderColor: '#afafaf'
    },
    commentCount: {
        alignSelf: 'center',
        fontWeight: '500',
        fontSize: 12
    }
});
