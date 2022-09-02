// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {SelectSortDirection} from "./select-sort-direction";
import {ShowNewLiveCommentsButton} from "./show-new-live-comments-button";
import {State, useHookstate} from "@hookstate/core";
import { CommentCount } from './comment-count';
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface LiveCommentingTopAreaProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function LiveCommentingTopArea(props: LiveCommentingTopAreaProps) {
    const {styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const areCommentsVisible = state.commentsVisible.get();
    const serverCommentCount = state.commentCountOnServer.get();
    return <View>
        <View>{
            state.config.inputAfterComments.get() !== true && <View style={props.styles.topArea?.replyArea}><ReplyArea state={state} styles={styles}/></View>
        }</View>
        <View>{
            state.config.useShowCommentsToggle.get() && serverCommentCount > 0 && <ShowHideCommentsToggle state={state} styles={styles} />
        }</View>
        {
            areCommentsVisible && serverCommentCount > 0
            && <View style={props.styles.topArea?.separator}>
                <CommentCount style={props.styles.topArea?.commentCount} state={state} count={serverCommentCount}/>
                {
                    areCommentsVisible && serverCommentCount > 1 && <SelectSortDirection state={state} styles={styles} />
                }
            </View>
        }
        <View>{
            areCommentsVisible && state.newRootCommentCount.get() > 1 && <ShowNewLiveCommentsButton state={state} styles={styles} />
        }</View>
    </View>;
}
