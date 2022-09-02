// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {Text, TouchableOpacity} from 'react-native';
import {State} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface ShowHideCommentsToggleProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function ShowHideCommentsToggle({state, styles}: ShowHideCommentsToggleProps) {
    const commentsVisible = state.commentsVisible.get();
    const translation = commentsVisible ? state.translations.HIDE_COMMENTS_BUTTON_TEXT.get() : state.translations.SHOW_COMMENTS_BUTTON_TEXT.get();
    translation.replace('[count]', Number(state.commentCountOnServer.get()).toLocaleString());
    return <TouchableOpacity style={styles.showHideCommentsToggle?.root} onPress={() => state.commentsVisible.set(!commentsVisible)}>
        <Text style={styles.showHideCommentsToggle?.text}>{translation}</Text>
    </TouchableOpacity>;
}
