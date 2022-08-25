import {TextInput} from "react-native";
import {MutableRefObject} from "react";
import {State} from "@hookstate/core";
import {EditorNodeText} from "./editor-node-text";

export enum EditorNodeType {
    TEXT,
    IMAGE,
    TEXT_BOLD,
    TEXT_ITALIC,
    TEXT_UNDERLINE,
    TEXT_STRIKETHROUGH,
    NEWLINE,
}

export interface EditorNodeDefinition {
    previous: EditorNodeDefinition | null
    next: EditorNodeDefinition | null
    content: string
    type: EditorNodeType
    ref?: MutableRefObject<TextInput | undefined>
    isSelected: boolean
}

export interface EditorNodeProps {
    node: State<EditorNodeDefinition>;
}

export function EditorNode({node}: EditorNodeProps) {
    if (node.type.get() === EditorNodeType.TEXT) {
        return <EditorNodeText node={node} />;
    }
    return null;
}
