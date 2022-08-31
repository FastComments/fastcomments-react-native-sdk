// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsCommentWithState} from "./comment";
import {Image, TouchableOpacity, Text, StyleSheet} from "react-native";
import {FastCommentsImageAsset} from "../types/image-asset";
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

function toggle(state: State<FastCommentsState>, commentId: string) {
    state.commentState[commentId].set((commentState) => {
        return {
            ...commentState,
            repliesHidden: !commentState?.repliesHidden
        }
    })
}

export function CommentReplyToggle({state, comment}: FastCommentsCommentWithState) {
    const nestedChildrenCount = comment.nestedChildrenCount.get();
    if (!nestedChildrenCount) {
        return null;
    }
    const countText = <Text style={[styles.text, styles.count]}> ({Number(nestedChildrenCount).toLocaleString()})</Text>
    const repliesHidden = state.commentState[comment._id.get()]?.repliesHidden?.get();
    if (repliesHidden) {
        return <TouchableOpacity onPress={() => toggle(state, comment._id.get())} style={styles.button}>
            <Image
                source={state.imageAssets[FastCommentsImageAsset.ICON_EYE].get()}
                style={styles.icon}/>
            <Text style={styles.text}>{state.translations.SHOW_REPLIES.get()}</Text>
            {countText}
        </TouchableOpacity>;
    } else {
        return <TouchableOpacity onPress={() => toggle(state, comment._id.get())} style={styles.button}>
            <Image
                source={state.imageAssets[FastCommentsImageAsset.ICON_EYE_SLASH].get()}
                style={styles.icon}/>
            <Text style={styles.text}>{state.translations.HIDE_REPLIES.get()}</Text>
            {countText}
        </TouchableOpacity>;
    }
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: "center",
        justifyContent: 'flex-start',
        marginTop: 10, // TODO move to consumer
        marginBottom: 10,
    },
    text: {
        fontSize: 12
    },
    count: {},
    icon: {
        width: 18,
        aspectRatio: 1,
        resizeMode: 'contain',
        marginRight: 5
    },
});
