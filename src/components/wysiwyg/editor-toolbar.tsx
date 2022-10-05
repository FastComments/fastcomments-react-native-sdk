import {StyleSheet, TouchableOpacity, View} from "react-native";
import {ReactNode} from "react";
import {State} from "@hookstate/core";
import {FastCommentsFromDiskAsset} from "../../types";
import {EditorNodeWithoutChildren} from "./node-types";

export interface EditorToolbarConfig {
    selectAndInsertImageAfterCurrentNode?: (currentNode: State<EditorNodeWithoutChildren>) => void
    getImagePathToInsert?: () => Promise<FastCommentsFromDiskAsset | string>
    uploadImage?: (currentNode: State<EditorNodeWithoutChildren>, asset: FastCommentsFromDiskAsset) => Promise<string>
    imageButton?: ReactNode
    gifPickerButton?: ReactNode
    selectAndInsertGIFAfterCurrentNode?: (currentNode: State<EditorNodeWithoutChildren>) => void
    getGIFPathToInsert?: () => Promise<string | false>
    toggleBold?: (currentNode: State<EditorNodeWithoutChildren>) => void
    boldButton?: ReactNode
    toggleItalic?: (currentNode: State<EditorNodeWithoutChildren>) => void
    italicButton?: ReactNode
    toggleUnderline?: (currentNode: State<EditorNodeWithoutChildren>) => void
    underlineButton?: ReactNode
    toggleStrikethrough?: (currentNode: State<EditorNodeWithoutChildren>) => void
    strikethroughButton?: ReactNode
    doNewline?: (currentNode: State<EditorNodeWithoutChildren>) => void
    newlineButton?: ReactNode
    getCurrentNode?: () => State<EditorNodeWithoutChildren>
}

export interface EditorToolbarProps {
    config: EditorToolbarConfig
}

export function EditorToolbar({config}: EditorToolbarProps) {
    return <View style={styles.root}>
        {config.boldButton && config.toggleBold && <TouchableOpacity onPress={() => config.toggleBold!(config.getCurrentNode!())} style={styles.button}>
            {config.boldButton}
        </TouchableOpacity>}
        {config.italicButton && config.toggleItalic && <TouchableOpacity onPress={() => config.toggleItalic!(config.getCurrentNode!())} style={styles.button}>
            {config.italicButton}
        </TouchableOpacity>}
        {config.underlineButton && config.toggleUnderline && <TouchableOpacity onPress={() => config.toggleUnderline!(config.getCurrentNode!())} style={styles.button}>
            {config.underlineButton}
        </TouchableOpacity>}
        {config.strikethroughButton && config.toggleStrikethrough && <TouchableOpacity onPress={() => config.toggleStrikethrough!(config.getCurrentNode!())} style={styles.button}>
            {config.strikethroughButton}
        </TouchableOpacity>}
        {config.imageButton && config.selectAndInsertImageAfterCurrentNode && <TouchableOpacity onPress={() => config.selectAndInsertImageAfterCurrentNode!(config.getCurrentNode!())} style={styles.button}>
            {config.imageButton}
        </TouchableOpacity>}
        {config.gifPickerButton && config.selectAndInsertGIFAfterCurrentNode && <TouchableOpacity onPress={() => config.selectAndInsertGIFAfterCurrentNode!(config.getCurrentNode!())} style={styles.button}>
            {config.gifPickerButton}
        </TouchableOpacity>}
    </View>;
}

const styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 25,
        padding: 5,
    },
    button: {
        marginRight: 10
    }
});
