import {StyleSheet, TouchableOpacity, View} from "react-native";
import {ReactNode} from "react";
import {EditorNodeDefinition} from "./editor-node";
import {State} from "@hookstate/core";
import {Asset} from "react-native-image-picker";

export interface EditorToolbarConfig {
    selectImage?: (definition: State<EditorNodeDefinition> | null) => void
    uploadImage?: (definition: State<EditorNodeDefinition> | null, asset: Asset) => Promise<string>
    imageButton?: ReactNode
    toggleBold?: (definition: State<EditorNodeDefinition> | null) => void
    boldButton?: ReactNode
    toggleItalic?: (definition: State<EditorNodeDefinition> | null) => void
    italicButton?: ReactNode
    toggleUnderline?: (definition: State<EditorNodeDefinition> | null) => void
    underlineButton?: ReactNode
    toggleStrikethrough?: (definition: State<EditorNodeDefinition> | null) => void
    strikethroughButton?: ReactNode
    doNewline?: (definition: State<EditorNodeDefinition> | null) => void
    newlineButton?: ReactNode
    getCurrentNode?: () => State<EditorNodeDefinition> | null
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
