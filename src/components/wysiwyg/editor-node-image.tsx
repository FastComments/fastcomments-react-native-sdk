import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {Image} from "react-native";
import {getNextNodeId} from "./node-id";

export function createImageNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        previous: null,
        next: null,
        content: startingValue,
        type: EditorNodeType.IMAGE,
        isFocused: false
    }
}

export function EditorNodeImage({node}: EditorNodeProps) {
    // TODO how to support both inline reacts and big images?
    return <Image source={{uri: node.content.get()}} style={{width: 32, height: 32}}/>;
}
