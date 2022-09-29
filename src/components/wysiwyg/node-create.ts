import {getNextNodeId} from "./node-id";
import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";

export function createTextNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT,
        isFocused: false
    }
}

export function createBoldNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_BOLD,
        isFocused: false
    }
}

export function createEmoticonNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.EMOTICON,
        isFocused: false
    }
}

export function createImageNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.IMAGE,
        isFocused: false
    }
}

export function createItalicNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_ITALIC,
        isFocused: false
    }
}

export function createNewlineNode(children?: EditorNodeWithoutChildren[]): EditorNodeNewLine {
    return {
        id: getNextNodeId(),
        type: EditorNodeType.NEWLINE,
        children
    }
}

export function createStrikethroughNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_STRIKETHROUGH,
        isFocused: false
    }
}

export function createUnderlineNode(startingValue: string): EditorNodeWithoutChildren {
    return {
        id: getNextNodeId(),
        content: startingValue,
        type: EditorNodeType.TEXT_UNDERLINE,
        isFocused: false
    }
}
