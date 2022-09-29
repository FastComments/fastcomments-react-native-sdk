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
export const EditorNodeTextTypes: EditorNodeTextType[] = [
    EditorNodeTextType.TEXT,
    EditorNodeTextType.TEXT_BOLD,
    EditorNodeTextType.TEXT_ITALIC,
    EditorNodeTextType.TEXT_STRIKETHROUGH,
    EditorNodeTextType.TEXT_UNDERLINE,
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

export interface EditorNodeWithoutChildren {
    id: number
    content: string
    type: EditorNodeType
    isFocused: boolean
    lastFocusTime?: number
    /** For some text nodes, like those that show @mentions, you want to delete in one backspace. **/
    deleteOnBackspace?: boolean
}

export interface EditorNodeNewLine {
    id: number
    type: EditorNodeType.NEWLINE
    /** We only support one level of nesting of children (for performance/complexity reasons).
     * Nobody wants to use an editor on mobile that complicated anyway. **/
    children?: EditorNodeWithoutChildren[]
}
