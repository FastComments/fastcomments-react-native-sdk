// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {Text, View} from "react-native";
import {State} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface ShowNewLiveCommentsButtonProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function ShowNewLiveCommentsButton({state, styles}: ShowNewLiveCommentsButtonProps) {
    const newRootCommentCount = state.newRootCommentCount.get()
    return <View style={styles.showNewLiveComments.button}>
        <Text style={styles.showNewLiveComments.count}>{Number(newRootCommentCount).toLocaleString()}</Text>
        <Text style={styles.showNewLiveComments.text}>{newRootCommentCount > 1 ? state.translations.NEW_COMMENTS_CLICK_SHOW.get() : state.translations.NEW_COMMENT_CLICK_SHOW.get()}</Text>
    </View>;
}
