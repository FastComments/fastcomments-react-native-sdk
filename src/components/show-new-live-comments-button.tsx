// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {Text, StyleSheet, View} from "react-native";

export function ShowNewLiveCommentsButton(state: FastCommentsState) {
    return <View style={styles.button}>
        <Text style={styles.count}>{Number(state.newRootCommentCount).toLocaleString()}</Text>
        <Text style={styles.text}>{state.newRootCommentCount > 1 ? state.translations.NEW_COMMENTS_CLICK_SHOW : state.translations.NEW_COMMENT_CLICK_SHOW}</Text>
    </View>;
}

const styles = StyleSheet.create({
    button: {
        "width": "fit-content",
        "marginTop": 20,
        "marginRight": "auto",
        "marginBottom": 0,
        "marginLeft": "auto",
        "paddingTop": 5,
        "paddingRight": 10,
        "paddingBottom": 5,
        "paddingLeft": 10,
        "textAlign": "center",
        "cursor": "pointer",
        "fontWeight": "500"
    },
    count: {
        "pointerEvents": "none",
        "position": "relative",
        "top": 1,
        "minWidth": 12,
        "paddingTop": 2,
        "paddingRight": 5,
        "paddingBottom": 4,
        "paddingLeft": 5,
        "marginRight": 3,
        "borderWidth": 1,
        "borderColor": "#a2a2a2",
        "borderStyle": "solid",
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 0,
        "borderBottomRightRadius": 4,
        "borderBottomLeftRadius": 4
    },
    text: {
        "pointerEvents": "none",
        "paddingBottom": 2,
        "borderBottom": "1px solid #a3a3a3"
    }
});
