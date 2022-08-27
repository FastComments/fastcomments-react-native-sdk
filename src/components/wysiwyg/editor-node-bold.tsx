import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {getNextNodeId} from "./node-id";
import {EditorNodeText} from "./editor-node-text";

export function createBoldNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_BOLD,
        isFocused: false
    }
}

export function EditorNodeBold({node, onBlur, onFocus, onDelete}: EditorNodeProps) {
    return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} style={{fontWeight: 'bold'}} />
}
