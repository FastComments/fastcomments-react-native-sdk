import {EditorNodeText} from "./editor-node-text";
import {EditorNodeEmoticon} from "./editor-node-emoticon";
import {TextStyle} from "react-native";
import {EditorNodeType, EditorNodeWithoutChildren} from "./node-types";
import {EditorNodeImage} from "./editor-node-image";
import {State} from "@hookstate/core";

export interface EditorNodeProps {
    nodeState: State<EditorNodeWithoutChildren>
    textStyle?: TextStyle
    onBlur?: () => void
    onChangeContent?: (newValue: string) => void
    onFocus?: () => void
    /** The current node says I want to be deleted. **/
    doDelete?: () => void
    /** The current node says I want to delete the node before me. **/
    doDeleteNodeBefore?: () => void
    onTryNewline?: () => void
    isMultiLine?: boolean
    setSelection?: (selection?: {start: number, end: number}) => void
}

export function EditorNode(props: EditorNodeProps) {
    // OPTIMIZATION: in order of popularity
    // OPTIMIZATION: Not using TSX here to try to reduce number of objects getting re-allocated, instead calling element function with same props object.
    switch (props.nodeState.type.get()) {
        // we do this in an attempt to not re-render the code and trigger keyboard blur/focus on backspacing bold->text etc
        case EditorNodeType.TEXT:
        case EditorNodeType.TEXT_BOLD:
        case EditorNodeType.TEXT_ITALIC:
        case EditorNodeType.TEXT_UNDERLINE:
        case EditorNodeType.TEXT_STRIKETHROUGH:
            return EditorNodeText(props);
        case EditorNodeType.EMOTICON:
            return EditorNodeEmoticon(props);
        case EditorNodeType.IMAGE:
            return EditorNodeImage(props);
    }
    // OPTIMIZATION: We don't actually have to render newline nodes.
    // if (props.node.type.get() === EditorNodeType.NEWLINE) {
    //     return EditorNodeNewline(props);
    // }
    return null;
}
