import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text} from 'react-native';

export function ShowHideCommentsToggle(state: FastCommentsState) {
    const translation = state.commentsVisible ? state.translations.HIDE_COMMENTS_BUTTON_TEXT : state.translations.SHOW_COMMENTS_BUTTON_TEXT;
    translation.replace('[count]', Number(state.commentCountOnServer).toLocaleString());
    return <Text style={styles.text}>{translation}</Text>;
}

const styles = StyleSheet.create({
    text: {
        "width": "fit-content",
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

