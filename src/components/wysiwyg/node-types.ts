export enum EditorNodeType {
    NEWLINE,
    TEXT,
    TEXT_BOLD,
    EMOTICON,
    IMAGE,
    TEXT_ITALIC,
    TEXT_STRIKETHROUGH,
    TEXT_UNDERLINE,
}

export enum EditorNodeTextType {
    TEXT = EditorNodeType.TEXT,
    TEXT_BOLD = EditorNodeType.TEXT_BOLD,
    TEXT_ITALIC = EditorNodeType.TEXT_ITALIC,
    TEXT_STRIKETHROUGH = EditorNodeType.TEXT_STRIKETHROUGH,
    TEXT_UNDERLINE = EditorNodeType.TEXT_UNDERLINE,
}

export const EditorNodeImageTypes = [EditorNodeType.EMOTICON, EditorNodeType.IMAGE];
export const EditorNodeTextTypes = [
    EditorNodeType.TEXT,
    EditorNodeType.TEXT_BOLD,
    EditorNodeType.TEXT_ITALIC,
    EditorNodeType.TEXT_STRIKETHROUGH,
    EditorNodeType.TEXT_UNDERLINE,
];

export const EditorNodeNames = {
    [EditorNodeType.NEWLINE]: 'NEWLINE',
    [EditorNodeType.TEXT]: 'TEXT',
    [EditorNodeType.TEXT_BOLD]: 'TEXT_BOLD',
    [EditorNodeType.EMOTICON]: 'EMOTICON',
    [EditorNodeType.IMAGE]: 'IMAGE',
    [EditorNodeType.TEXT_ITALIC]: 'TEXT_ITALIC',
    [EditorNodeType.TEXT_STRIKETHROUGH]: 'TEXT_STRIKETHROUGH',
    [EditorNodeType.TEXT_UNDERLINE]: 'TEXT_UNDERLINE',
}

export interface EditorNodeDefinition {
    id: number
    content: string
    type: EditorNodeType
    isFocused: boolean
    lastFocusTime?: number
    /** For some text nodes, like those that show @mentions, you want to delete in one backspace. **/
    deleteOnBackspace?: boolean
}
