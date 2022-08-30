import {State} from "@hookstate/core";
import {EditorNodeText} from "./editor-node-text";
import {EditorNodeBold} from "./editor-node-bold";
import {EditorNodeItalic} from "./editor-node-italic";
import {EditorNodeStrikethrough} from "./editor-node-strikethrough";
import {EditorNodeUnderline} from "./editor-node-underline";
import {EditorNodeImage} from "./editor-node-image";
import {EditorNodeEmoticon} from "./editor-node-emoticon";

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

export interface EditorNodeDefinition {
    id: number
    content: string
    type: EditorNodeType
    isFocused: boolean
    lastFocusTime?: number
}

export interface EditorNodeProps {
    node: State<EditorNodeDefinition>;
    onBlur?: () => void
    onFocus?: () => void
    onDelete?: () => void
}

export function EditorNode(props: EditorNodeProps) {
    // OPTIMIZATION: in order of popularity
    if (props.node.type.get() === EditorNodeType.TEXT) {
        // Not using TSX here to try to reduce number of objects getting re-allocated, instead calling element function with same props object.
        return EditorNodeText(props);
    }
    if (props.node.type.get() === EditorNodeType.EMOTICON) {
        return EditorNodeEmoticon(props);
    }
    if (props.node.type.get() === EditorNodeType.TEXT_BOLD) {
        return EditorNodeBold(props);
    }
    if (props.node.type.get() === EditorNodeType.IMAGE) {
        return EditorNodeImage(props);
    }
    if (props.node.type.get() === EditorNodeType.TEXT_ITALIC) {
        return EditorNodeItalic(props);
    }
    if (props.node.type.get() === EditorNodeType.TEXT_UNDERLINE) {
        return EditorNodeUnderline(props);
    }
    if (props.node.type.get() === EditorNodeType.TEXT_STRIKETHROUGH) {
        return EditorNodeStrikethrough(props);
    }
    return null;
}
