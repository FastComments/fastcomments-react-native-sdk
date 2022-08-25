import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {StyleSheet, TextInput} from "react-native";

export interface CommentTextAreaProps {
    state: State<FastCommentsState>
    value?: string
    onChangeText: (value: string) => void
    onFocus?: () => void
}

export function CommentTextArea({state, value, onChangeText, onFocus}: CommentTextAreaProps) {
    // TODO toolbar
    // TODO toolbar w/ gif selector
    if (state.config.experimentalWYSIWYG.get()) {
        // TODO write WYSIWYG editor that supports images and cursor movement
        return null;
    } else {
        return <TextInput
            style={styles.textarea}
            multiline={!state.config.useSingleLineCommentInput.get()}
            maxLength={state.config.maxCommentCharacterLength.get() || 2000}
            placeholder={state.translations.ENTER_COMMENT_HERE.get()}
            value={value}
            onChangeText={(value) => onChangeText(value)}
            onFocus={onFocus}
        />
    }
}

const styles = StyleSheet.create({
    textarea: {
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: 'black',
        borderRadius: 11
    },
})
