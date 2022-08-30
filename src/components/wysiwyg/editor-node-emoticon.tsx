import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {Image} from "react-native";
import {getNextNodeId} from "./node-id";

export function createEmoticonNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.EMOTICON,
        isFocused: false
    }
}

export function EditorNodeEmoticon({node}: EditorNodeProps) {
    return <Image source={{uri: node.content.get()}} style={{width: 22, height: 22, marginLeft: 1, marginRight: 1}}/>;
}
