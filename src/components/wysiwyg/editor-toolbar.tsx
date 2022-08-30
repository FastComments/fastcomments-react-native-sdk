import {StyleSheet, TouchableOpacity, View} from "react-native";
import {ReactNode} from "react";
import {EditorNodeDefinition} from "./editor-node";
import {State} from "@hookstate/core";
import {Asset} from "react-native-image-picker";

export interface EditorToolbarConfig {
    selectImage?: (currentNode: State<EditorNodeDefinition>) => void
    uploadImage?: (currentNode: State<EditorNodeDefinition>, asset: Asset) => Promise<string>
    imageButton?: ReactNode
    toggleBold?: (currentNode: State<EditorNodeDefinition>) => void
    boldButton?: ReactNode
    toggleItalic?: (currentNode: State<EditorNodeDefinition>) => void
    italicButton?: ReactNode
    toggleUnderline?: (currentNode: State<EditorNodeDefinition>) => void
    underlineButton?: ReactNode
    toggleStrikethrough?: (currentNode: State<EditorNodeDefinition>) => void
    strikethroughButton?: ReactNode
    doNewline?: (currentNode: State<EditorNodeDefinition>) => void
    newlineButton?: ReactNode
    getCurrentNode?: () => State<EditorNodeDefinition>
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
        {config.imageButton && config.selectImage && <TouchableOpacity onPress={() => config.selectImage!(config.getCurrentNode!())} style={styles.button}>
            {config.imageButton}
        </TouchableOpacity>}
    </View>;
}

const styles = StyleSheet.create({
    root: {
        height: 25,
        padding: 5,
        flexDirection: 'row'
    },
    button: {
        marginRight: 10
    }
});
