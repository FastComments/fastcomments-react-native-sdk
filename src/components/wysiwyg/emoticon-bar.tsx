import {ImageStyle, TouchableOpacity, View, ViewStyle} from "react-native";
import {ReactNode} from "react";
import {State} from "@hookstate/core";
import {EditorNodeDefinition} from "./node-types";

export interface EmoticonBarConfig {
    // a list of images, and toolbar buttons (in tuple array to save a few bytes per entry vs having entire object)
    emoticons?: [string, ReactNode][]
    addEmoticon?: (currentNode: State<EditorNodeDefinition>, src: string) => void
    getCurrentNode?: () => State<EditorNodeDefinition>
}

export interface EmoticonBarStyles {
    root?: ViewStyle
    button?: ViewStyle
    icon?: ImageStyle
}

export interface EditorToolbarProps {
    config: EmoticonBarConfig
    styles?: EmoticonBarStyles
}

export function EmoticonBar({config, styles}: EditorToolbarProps) {
    return <View style={styles?.root}>
        {config.emoticons && config.emoticons.map((emoticonSrcAndButton) => <TouchableOpacity
            key={emoticonSrcAndButton[0]}
            onPress={() => config.addEmoticon!(config.getCurrentNode!(), emoticonSrcAndButton[0])}
            style={styles?.button}>
            {emoticonSrcAndButton[1]}
        </TouchableOpacity>)}
    </View>;
}
