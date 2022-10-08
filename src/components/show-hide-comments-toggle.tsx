import {FastCommentsState, IFastCommentsStyles} from "../types";
import {Text, TouchableOpacity} from 'react-native';
import {State} from "@hookstate/core";

export interface ShowHideCommentsToggleProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function ShowHideCommentsToggle({state, styles}: ShowHideCommentsToggleProps) {
    const commentsVisible = state.commentsVisible.get();
    let translation = commentsVisible ? state.translations.HIDE_COMMENTS_BUTTON_TEXT.get() : state.translations.SHOW_COMMENTS_BUTTON_TEXT.get();
    if (!translation) {
        translation = 'ERROR';
    }
    translation = translation.replace('[count]', Number(state.commentCountOnServer.get()).toLocaleString());
    return <TouchableOpacity style={styles.showHideCommentsToggle?.root} onPress={() => state.commentsVisible.set(!commentsVisible)}>
        <Text style={styles.showHideCommentsToggle?.text}>{translation}</Text>
    </TouchableOpacity>;
}
