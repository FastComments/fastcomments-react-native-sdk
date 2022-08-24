// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text} from 'react-native';
import {State} from "@hookstate/core";

export function ShowHideCommentsToggle(state: State<FastCommentsState>) {
    const translation = state.commentsVisible.get() ? state.translations.HIDE_COMMENTS_BUTTON_TEXT.get() : state.translations.SHOW_COMMENTS_BUTTON_TEXT.get();
    translation.replace('[count]', Number(state.commentCountOnServer.get()).toLocaleString());
    return <Text style={styles.text}>{translation}</Text>;
}

const styles = StyleSheet.create({
    text: {
        flex: 1,
        "margin": "20px auto",
        "cursor": "pointer",
        "padding": "10px 17px 10px 27px",
        "borderRadius": 7,
        "background": "#333",
        "color": "#fff",
        "textDecoration": "none",
        "fontSize": 17,
        "fontWeight": "500",
        "userSelect": "none"
    }
});

