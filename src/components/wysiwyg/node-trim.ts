import {EditorNodeType} from "./editor-node";

export function getContentTrimmed(type: EditorNodeType, content: string, length: number): string | null {
    switch (type) {
        case EditorNodeType.TEXT:
            return content.substr(0, length);
        case EditorNodeType.IMAGE:
            return null; // TODO
        case EditorNodeType.TEXT_BOLD:
            return null; // TODO
        case EditorNodeType.TEXT_ITALIC:
            return null; // TODO
        case EditorNodeType.TEXT_UNDERLINE:
            return null; // TODO
        case EditorNodeType.TEXT_STRIKETHROUGH:
            return null; // TODO
        case EditorNodeType.NEWLINE:
            return null; // TODO
    }
}
