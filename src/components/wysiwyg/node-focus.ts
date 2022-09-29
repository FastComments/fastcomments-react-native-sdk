import {State} from "@hookstate/core";
import {EditorNodeWithoutChildren} from "./node-types";

export function focusNode(node: EditorNodeWithoutChildren) {
    node.isFocused = true;
    node.lastFocusTime = Date.now();
}

export function focusNodeState(node: State<EditorNodeWithoutChildren>) {
    node.isFocused.set(true);
    node.lastFocusTime.set(Date.now());
}
