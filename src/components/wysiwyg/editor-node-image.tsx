import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {Image} from "react-native";
import {getNextNodeId} from "./node-id";

export function createImageNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.IMAGE,
        isFocused: false
    }
}

export function EditorNodeImage({node}: EditorNodeProps) {
    return <Image source={{uri: node.content.get()}} style={{
        flexGrow: 1,
        aspectRatio: 1,
        resizeMode: 'contain',
        marginTop: 10,
        marginBottom: 10
    }}/>;
}
