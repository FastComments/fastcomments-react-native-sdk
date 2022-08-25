import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Text, StyleSheet} from "react-native";
import {Editor} from "./wysiwyg/wysiwyg-editor";
import {useState} from "react";

export interface CommentTextAreaProps {
    state: State<FastCommentsState>
    value?: string
    onChangeText: (value: string) => void
    onFocus?: () => void
}

export function CommentTextArea({state, value, onChangeText, onFocus: _onFocus}: CommentTextAreaProps) {
    // TODO toolbar
    // TODO toolbar w/ gif selector
    const [isFocused, setFocused] = useState(false);
    console.log('isFocused', isFocused, 'value', value); // TODO REMOVE
    const placeholder = !isFocused && <Text style={styles.placeholder}>{state.translations.ENTER_COMMENT_HERE.get()}</Text>
    return <Editor
        value={value || ''}
        style={styles.textarea}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
    />
    // return <TextInput
    //     style={styles.textarea}
    //     multiline={!state.config.useSingleLineCommentInput.get()}
    //     maxLength={state.config.maxCommentCharacterLength.get() || 2000}
    //     placeholder={state.translations.ENTER_COMMENT_HERE.get()}
    //     value={value}
    //     onChangeText={(value) => onChangeText(value)}
    //     onFocus={onFocus}
    // />
}

const styles = StyleSheet.create({
    textarea: {
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: 'black',
        borderRadius: 11
    },
    placeholder: {
        position: 'absolute',
        padding: 13,
        color: '#000' // TODO don't use #000
    },
})
