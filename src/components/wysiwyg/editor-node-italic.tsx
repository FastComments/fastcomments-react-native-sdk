import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {getNextNodeId} from "./node-id";
import {EditorNodeText} from "./editor-node-text";

export function createItalicNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_ITALIC,
        isFocused: false
    }
}

export function EditorNodeItalic({node, onBlur, onFocus, onDelete}: EditorNodeProps) {
    return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} style={{fontStyle: 'italic'}} />
}
