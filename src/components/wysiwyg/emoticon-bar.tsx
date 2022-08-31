import {StyleSheet, TouchableOpacity, View} from "react-native";
import {ReactNode} from "react";
import {EditorNodeDefinition} from "./editor-node";
import {State} from "@hookstate/core";

export interface EmoticonBarConfig {
    // a list of images, and toolbar buttons (in tuple array to save a few bytes per entry vs having entire object)
    emoticons: [string, ReactNode][]
    addEmoticon?: (currentNode: State<EditorNodeDefinition>, src: string) => void
    getCurrentNode?: () => State<EditorNodeDefinition>
}

export interface EditorToolbarProps {
    config: EmoticonBarConfig
}

export function EmoticonBar({config}: EditorToolbarProps) {
    return <View style={styles.root}>
        {config.emoticons.map((emoticonSrcAndButton) => <TouchableOpacity
            key={emoticonSrcAndButton[0]}
            onPress={() => config.addEmoticon!(config.getCurrentNode!(), emoticonSrcAndButton[0])}
            style={styles.button}>
            {emoticonSrcAndButton[1]}
        </TouchableOpacity>)}
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
        marginRight: 10,
    }
});
