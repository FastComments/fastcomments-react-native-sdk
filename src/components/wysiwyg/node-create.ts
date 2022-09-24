import {getNextNodeId} from "./node-id";
import {EditorNodeDefinition, EditorNodeType} from "./node-types";

export function createTextNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT,
        isFocused: false
    }
}

export function createBoldNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_BOLD,
        isFocused: false
    }
}

export function createEmoticonNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.EMOTICON,
        isFocused: false
    }
}

export function createImageNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.IMAGE,
        isFocused: false
    }
}

export function createItalicNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_ITALIC,
        isFocused: false
    }
}

export function createNewlineNode(): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: '',
        type: EditorNodeType.NEWLINE,
        isFocused: false
    }
}

export function createStrikethroughNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_STRIKETHROUGH,
        isFocused: false
    }
}

export function createUnderlineNode(startingValue: string): EditorNodeDefinition {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_UNDERLINE,
        isFocused: false
    }
}
