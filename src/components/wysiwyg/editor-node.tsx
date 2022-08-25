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
    id: number,
    previous: EditorNodeDefinition | null
    next: EditorNodeDefinition | null
    content: string
    type: EditorNodeType
    isDeleted?: boolean // used for communication between elements
    isFocused: boolean
}

export interface EditorNodeProps {
    node: State<EditorNodeDefinition>;
    onBlur?: () => void
    onFocus?: () => void
}

export function EditorNode({node, onBlur, onFocus}: EditorNodeProps) {
    if (node.type.get() === EditorNodeType.TEXT) {
        return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} />;
    }
    return null;
}
