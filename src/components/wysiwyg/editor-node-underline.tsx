import {EditorNodeDefinition, EditorNodeProps, EditorNodeType} from "./editor-node";
import {getNextNodeId} from "./node-id";
import {EditorNodeText} from "./editor-node-text";

export function createUnderlineNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_UNDERLINE,
        isFocused: false
    }
}

export function EditorNodeUnderline({node, textStyle, onBlur, onFocus, onDelete}: EditorNodeProps) {
    return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} textStyle={{textDecorationLine: 'underline', ...textStyle}} />;
}
