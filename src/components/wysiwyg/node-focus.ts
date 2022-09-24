import {State} from "@hookstate/core";
import {EditorNodeDefinition} from "./node-types";

export function focusNode(node: EditorNodeDefinition) {
    node.isFocused = true;
    node.lastFocusTime = Date.now();
}

export function focusNodeState(node: State<EditorNodeDefinition>) {
    node.isFocused.set(true);
    node.lastFocusTime.set(Date.now());
}
