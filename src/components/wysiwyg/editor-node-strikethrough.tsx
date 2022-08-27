import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {getNextNodeId} from "./node-id";
import {EditorNodeText} from "./editor-node-text";

export function createStrikethroughNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_STRIKETHROUGH,
        isFocused: false
    }
}

export function EditorNodeStrikethrough({node, onBlur, onFocus, onDelete}: EditorNodeProps) {
    return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} style={{textDecorationLine: 'line-through'}} />
}
