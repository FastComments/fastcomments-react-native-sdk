import {State} from "@hookstate/core";
import {EditorNodeText} from "./editor-node-text";
import {EditorNodeBold} from "./editor-node-bold";
import {EditorNodeItalic} from "./editor-node-italic";
import {EditorNodeStrikethrough} from "./editor-node-strikethrough";
import {EditorNodeUnderline} from "./editor-node-underline";
import {EditorNodeImage} from "./editor-node-image";

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
    prev?: EditorNodeDefinition
    next?: EditorNodeDefinition
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

export function EditorNode({node, onBlur, onFocus, onDelete}: EditorNodeProps) {
    // OPTIMIZATION: in order of popularity
    if (node.type.get() === EditorNodeType.TEXT) {
        return <EditorNodeText node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    if (node.type.get() === EditorNodeType.TEXT_BOLD) {
        return <EditorNodeBold node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    if (node.type.get() === EditorNodeType.IMAGE) {
        return <EditorNodeImage node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    if (node.type.get() === EditorNodeType.TEXT_ITALIC) {
        return <EditorNodeItalic node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    if (node.type.get() === EditorNodeType.TEXT_UNDERLINE) {
        return <EditorNodeUnderline node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    if (node.type.get() === EditorNodeType.TEXT_STRIKETHROUGH) {
        return <EditorNodeStrikethrough node={node} onBlur={onBlur} onFocus={onFocus} onDelete={onDelete} />;
    }
    return null;
}
