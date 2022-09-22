import {State} from "@hookstate/core";
import {EditorNodeText} from "./editor-node-text";
import {EditorNodeBold} from "./editor-node-bold";
import {EditorNodeItalic} from "./editor-node-italic";
import {EditorNodeStrikethrough} from "./editor-node-strikethrough";
import {EditorNodeUnderline} from "./editor-node-underline";
import {EditorNodeImage} from "./editor-node-image";
import {EditorNodeEmoticon} from "./editor-node-emoticon";
import {TextStyle} from "react-native";

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
    /** For some text nodes, like those that show @mentions, you want to delete in one backspace. **/
    deleteOnBackspace?: boolean
}

export interface EditorNodeProps {
    node: State<EditorNodeDefinition>
    textStyle?: TextStyle
    onBlur?: () => void
    onFocus?: () => void
    onDelete?: () => void
    onTryNewline?: () => void
    isMultiLine?: boolean
}

export function EditorNode(props: EditorNodeProps) {
    // OPTIMIZATION: in order of popularity
    // OPTIMIZATION: Not using TSX here to try to reduce number of objects getting re-allocated, instead calling element function with same props object.
    if (props.node.type.get() === EditorNodeType.TEXT) {
        return EditorNodeText(props);
    }
    if (props.node.type.get() === EditorNodeType.EMOTICON) {
        return EditorNodeEmoticon(props);
    }
    // OPTIMIZATION: We don't actually have to render newline nodes.
    // if (props.node.type.get() === EditorNodeType.NEWLINE) {
    //     return EditorNodeNewline(props);
    // }
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
