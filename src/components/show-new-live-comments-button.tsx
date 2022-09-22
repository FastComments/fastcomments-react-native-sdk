// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState, IFastCommentsStyles} from "../types";
import {Text, TouchableOpacity} from "react-native";
import {State} from "@hookstate/core";
import {iterateCommentsTreeState} from "../services/comment-trees";

export interface ShowNewLiveCommentsButtonProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

function showHiddenComments(state: State<FastCommentsState>) {
    iterateCommentsTreeState(state.commentsTree, (comment) => {
        if (comment.hidden.get()) {
            comment.hidden.set(false);
        }
    });
    state.newRootCommentCount.set(0);
}

export function ShowNewLiveCommentsButton({state, styles}: ShowNewLiveCommentsButtonProps) {
    const newRootCommentCount = state.newRootCommentCount.get();
    return <TouchableOpacity style={styles.showNewLiveComments?.button} onPress={() => showHiddenComments(state)}>
        <Text style={styles.showNewLiveComments?.count}>{Number(newRootCommentCount).toLocaleString()}</Text>
        <Text style={styles.showNewLiveComments?.text}>{newRootCommentCount > 1 ? state.translations.NEW_COMMENTS_CLICK_SHOW.get() : state.translations.NEW_COMMENT_CLICK_SHOW.get()}</Text>
    </TouchableOpacity>;
}
