// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsCommentWithState} from "./comment";
import {Image, TouchableOpacity, Text} from "react-native";
import {FastCommentsImageAsset} from "../types/image-asset";
import {State, useHookstate} from "@hookstate/core";

export interface CommentReplyToggleProps extends FastCommentsCommentWithState {
    repliesHiddenState: State<boolean>
}

// TODO why does this cause all comments to re-render? maybe we should instead store this state in the parent structure and just use callbacks
//  and then the comment.repliesHidden will just be for initial state, which sucks, but it's all the name of a good experience./
export function CommentReplyToggle(props: CommentReplyToggleProps) {
    const {comment, styles} = props;
    const state = useHookstate(props.state); // creating scoped state
    const nestedChildrenCount = comment.nestedChildrenCount.get();
    if (!nestedChildrenCount) {
        return null;
    }
    const countText = <Text style={[styles.commentReplyToggle?.text, styles.commentReplyToggle?.count]}> ({Number(nestedChildrenCount).toLocaleString()})</Text>
    const repliesHidden = props.repliesHiddenState.get();
    if (repliesHidden) {
        return <TouchableOpacity onPress={() => props.repliesHiddenState.set(false)} style={styles.commentReplyToggle?.button}>
            <Image
                source={state.imageAssets[FastCommentsImageAsset.ICON_EYE].get()}
                style={styles.commentReplyToggle?.icon}/>
            <Text style={styles.commentReplyToggle?.text}>{state.translations.SHOW_REPLIES.get()}</Text>
            {countText}
        </TouchableOpacity>;
    } else {
        return <TouchableOpacity onPress={() => props.repliesHiddenState.set(true)} style={styles.commentReplyToggle?.button}>
            <Image
                source={state.imageAssets[FastCommentsImageAsset.ICON_EYE_SLASH].get()}
                style={styles.commentReplyToggle?.icon}/>
            <Text style={styles.commentReplyToggle?.text}>{state.translations.HIDE_REPLIES.get()}</Text>
            {countText}
        </TouchableOpacity>;
    }
}
