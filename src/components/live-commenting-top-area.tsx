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
import {ImageAssetConfig, RNComment} from "../types";
import {CallbackObserver} from "./live-commenting-bottom-area";
import {FastCommentsRNConfig} from "../types/react-native-config";

export interface LiveCommentingTopAreaProps {
    imageAssets: ImageAssetConfig
    config: FastCommentsRNConfig
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
    translations: Record<string, string>
    onReplySuccess?: (comment: RNComment) => void
    callbackObserver: CallbackObserver
}

export function LiveCommentingTopArea(props: LiveCommentingTopAreaProps) {
    const {config, imageAssets, styles, translations, onReplySuccess, callbackObserver} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const areCommentsVisible = state.commentsVisible.get();
    const serverCommentCount = state.commentCountOnServer.get();
    return <View>
        <View>{
            config.inputAfterComments !== true &&
                <View style={props.styles.topArea?.replyArea}>
                    <ReplyArea imageAssets={imageAssets} state={state} styles={styles} translations={translations} onReplySuccess={onReplySuccess} replyingTo={callbackObserver.replyingTo}/>
                </View>
        }</View>
        <View>{
            config.useShowCommentsToggle && serverCommentCount > 0 && <ShowHideCommentsToggle state={state} styles={styles} />
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
