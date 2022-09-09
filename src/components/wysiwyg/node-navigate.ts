import {EditorNodeDefinition} from "./editor-node";
import {State} from "@hookstate/core";

// We used to use a doubly linked list but it was a huge pain.

export function getStatePrev(nodes: State<EditorNodeDefinition[]>, id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id.get() === id);
    // without this check - weird behavior in delete flow
    if (index - 1 < 0) {
        return null;
    }
    return nodes[index - 1];
}

export function getStateNext(nodes: State<EditorNodeDefinition[]>, id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id.get() === id);
    // without this check - weird behavior in delete flow
    if (index + 1 > nodes.length - 1) {
        return null;
    }
    return nodes[index + 1];
}

export function getNext(nodes: EditorNodeDefinition[], id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id === id);
    // without this check - weird behavior in delete flow
    if (index + 1 > nodes.length - 1) {
        return null;
    }
    return nodes[index + 1];
}

export function getPrev(nodes: EditorNodeDefinition[], id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id === id);
    // without this check - weird behavior in delete flow
    if (index - 1 < 0) {
        return null;
    }
    return nodes[index - 1];
}
