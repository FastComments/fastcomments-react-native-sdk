import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";

export function insertAfter(nodes: EditorNodeNewLine[], afterId: number, nodeToInsert: EditorNodeNewLine | EditorNodeWithoutChildren) {
    let topLevelIndex = 0;
    for (const node of nodes) {
        if (node.id === afterId) {
            if (nodeToInsert.type === EditorNodeType.NEWLINE) {
                if ('children' in nodeToInsert) { // this is to make compiler happy, but not sure it would ever not be true.
                    nodes.splice(topLevelIndex + 1, 0, nodeToInsert);
                } else {
                    console.log('FastComments insertAfter: Unexpected state - inserting newline node without children?');
                }
            } else {
                if (!node.children) {
                    node.children = [];
                }
                node.children.push(nodeToInsert);
            }
            return;
        }
        topLevelIndex++;
        if (node.children) {
            let currentIndex = node.children.findIndex((searchingNode) => searchingNode.id === afterId);
            if (currentIndex > -1) {
                if (nodeToInsert.type === EditorNodeType.NEWLINE) {
                    // since it's a newline node, insert it after the current row.
                    // We could move everything in children in afterId to the new row, too, if it's a requirement.
                    if ('children' in nodeToInsert) { // this is to make compiler happy, but not sure it would ever not be true.
                        nodes.splice(topLevelIndex + 1, 0, nodeToInsert);
                    } else {
                        console.log('FastComments node-insert: Unexpected state - inserting newline node without children?');
                    }
                } else {
                    node.children.splice(currentIndex + 1, 0, nodeToInsert);
                }
                return;
            }
        }
    }
}

export function insertBefore(nodes: EditorNodeNewLine[], beforeId: number, nodeToInsert: EditorNodeNewLine | EditorNodeWithoutChildren) {
    let topLevelIndex = 0;
    for (const node of nodes) {
        if (node.id === beforeId) {
            if (nodeToInsert.type === EditorNodeType.NEWLINE) {
                if ('children' in nodeToInsert) { // this is to make compiler happy, but not sure it would ever not be true.
                    if (topLevelIndex === 0) {
                        nodes.unshift(nodeToInsert);
                    } else {
                        nodes.splice(topLevelIndex - 1, 0, nodeToInsert);
                    }
                } else {
                    console.log('FastComments node-insert: Unexpected state - inserting newline node without children?');
                }
            } else {
                if (!node.children) {
                    node.children = [];
                }
                node.children.unshift(nodeToInsert);
            }
            return;
        }
        topLevelIndex++;
        if (node.children) {
            let currentIndex = node.children.findIndex((searchingNode) => searchingNode.id === beforeId);
            if (currentIndex > -1) {
                if (nodeToInsert.type === EditorNodeType.NEWLINE) {
                    // since it's a newline node, insert it after the current row.
                    // We could move everything in children in beforeId to the new row, too, if it's a requirement.
                    if ('children' in nodeToInsert) { // this is to make compiler happy, but not sure it would ever not be true.
                        nodes.splice(topLevelIndex - 1, 0, nodeToInsert);
                    } else {
                        console.log('FastComments insertBefore: Unexpected state - inserting newline node without children?');
                    }
                } else {
                    if (currentIndex === 0) {
                        node.children.unshift(nodeToInsert);
                    } else {
                        node.children.splice(currentIndex - 1, 0, nodeToInsert);
                    }
                }
                return;
            }
        }
    }
}
