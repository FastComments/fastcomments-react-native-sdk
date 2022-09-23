import {EditorNodeDefinition} from "./editor-node";

export function insertAfter(nodes: EditorNodeDefinition[], afterId: number, node: EditorNodeDefinition) {
    let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === afterId);
    nodes.splice(currentIndex + 1, 0, node);
}

export function insertBefore(nodes: EditorNodeDefinition[], beforeId: number, node: EditorNodeDefinition) {
    let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === beforeId);
    nodes.splice(Math.max(currentIndex - 1, 0), 0, node);
}

export function insertChainAfter(nodes: EditorNodeDefinition[], afterId: number, newNodes: EditorNodeDefinition[]) {
    let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === afterId);
    nodes.splice(currentIndex + 1, 0, ...newNodes);
}

export function insertChainBefore(nodes: EditorNodeDefinition[], beforeId: number, newNodes: EditorNodeDefinition[]) {
    let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === beforeId);
    nodes.splice(currentIndex - 1, 0, ...newNodes);
}
