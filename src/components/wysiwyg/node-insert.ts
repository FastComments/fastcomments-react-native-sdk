import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";

export function insertAfter(nodes: EditorNodeNewLine[], afterId: number, node: EditorNodeNewLine | EditorNodeWithoutChildren) {
    if (node.type === EditorNodeType.NEWLINE) {
        let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === afterId);
        // @ts-ignore Why is the compiler complaining? node literally cannot be a EditorNodeWithoutChildren in this branch.
        nodes.splice(currentIndex + 1, 0, node);
    } else {
        // check children
        for (const node of nodes) {
            if (node.children) {
                let currentIndex = node.children.findIndex((searchingNode) => searchingNode.id === afterId);
                // @ts-ignore Why is the compiler complaining? node literally cannot be a EditorNodeNewLine in this branch.
                node.children.splice(currentIndex + 1, 0, node);
            }
        }
    }
}

export function insertBefore(nodes: EditorNodeNewLine[], beforeId: number, node: EditorNodeNewLine) {
    if (node.type === EditorNodeType.NEWLINE) {
        let currentIndex = nodes.findIndex((searchingNode) => searchingNode.id === beforeId);
        // @ts-ignore Why is the compiler complaining? node literally cannot be a EditorNodeWithoutChildren in this branch.
        nodes.splice(Math.max(currentIndex - 1, 0), 0, node);
    } else {
        // check children
        for (const node of nodes) {
            if (node.children) {
                let currentIndex = node.children.findIndex((searchingNode) => searchingNode.id === beforeId);
                // @ts-ignore Why is the compiler complaining? node literally cannot be a EditorNodeNewLine in this branch.
                node.children.splice(Math.max(currentIndex - 1, 0), 0, node);
            }
        }
    }
}
