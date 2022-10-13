/**
 * Which node should we focus on after delete?
 */
import {EditorNodeNames, EditorNodeNewLine, EditorNodeTextType, EditorNodeTextTypes, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";
import {graphToListWithNewlines} from "./node-navigate";

interface EditorNodeMergePlan {
    source: EditorNodeWithoutChildren
    target: EditorNodeWithoutChildren
}

// We should only had to remove some nodes, and maybe merge some.
// We shouldn't ever need to change focus or add nodes because that'd mess with the user's keyboard.
interface EditorNodeDeletionPlan {
    idsToRemove?: number[]
    merge?: EditorNodeMergePlan
}

// right now this just supports text, but that's all we need to merge
function mergeTextNodes(mergePlan: EditorNodeMergePlan) {
    mergePlan.target.content = mergePlan.source.content;
    mergePlan.target.type = mergePlan.source.type; // for example: backspacing BOLD into TEXT. Want to get rid of BOLD.
}

interface NodeSearchResult {
    startContainer?: EditorNodeNewLine
    start?: EditorNodeWithoutChildren
    end?: EditorNodeWithoutChildren
    endContainer?: EditorNodeNewLine
    nodesInBetween?: (EditorNodeNewLine | EditorNodeWithoutChildren)[]
}

function searchNodesOfTypeBeforeIdInclusive(graph: EditorNodeNewLine[], fromId: number, types: EditorNodeTextType[]): NodeSearchResult {
    const result: NodeSearchResult = {};

    const nodes = graphToListWithNewlines(graph);
    let index = nodes.findIndex((searchingNode) => searchingNode.id === fromId);
    console.log('starting index', index, fromId);
    while (index > -1) {
        const node = nodes[index];
        console.log('checking', index, node);
        if (!node) {
            continue
        }
        if (result.end) {
            if (types.includes(node.type as number)) {
                result.start = node as EditorNodeWithoutChildren;
                result.startContainer = graph.find((newline) => {
                    return newline.children && newline.children.some((child) => {
                        return child.id === node.id
                    });
                });
                break;
            } else {
                if (!result.nodesInBetween) {
                    result.nodesInBetween = [node];
                } else {
                    result.nodesInBetween.push(node);
                }
            }
        } else if (types.includes(node.type as number)) {
            result.end = node as EditorNodeWithoutChildren;
            result.endContainer = graph.find((newline) => {
                return newline.children && newline.children.some((child) => {
                    return child.id === node.id
                });
            });
        }
        index--;
    }

    return result;
}

/**
 * Get the plan for all the nodes to delete before the current one.
 * This is kind of like a plan for how a database executes a query. We create the "plan" for deletion and then act on it.
 * This is more of a functional-way of doing things, and it sacrifices a tiny bit of performance, but it makes this much easier
 * to debug.
 */
function getNodeDeletionPlan(graph: EditorNodeNewLine[], node: EditorNodeWithoutChildren, focusNode: EditorNodeWithoutChildren): EditorNodeDeletionPlan {
    const plan: EditorNodeDeletionPlan = {};

    /**
     * First find the closest text node, assuming node to delete is not that.
     * Traverse the node list until we find another text node.
     * Delete everything in between, and then merge the text nodes. and remove the first one.
     *
     * We will delete all nodes between the current one and that one. So for example:
     * NEWLINE (1)
     *  TEXT (2)
     * NEWLINE (3)
     *  TEXT (4)
     * NEWLINE (5)
     *  IMAGE (6)
     * NEWLINE (7)
     * TEXT (8, focused)
     * > User does backspace
     *
     * We should end up with:
     * NEWLINE (1)
     *  TEXT (2)
     * NEWLINE (3)
     *  TEXT (4)
     * NEWLINE (7)
     * TEXT (8, focused)
     *
     * In this case we have kept nodes 7 and 8 and instead deleted the newline and image before it (5, 6) to prevent keyboard from flashing/losing focus.
     *
     * In the case of emoticons:
     * NEWLINE (1)
     *  TEXT(2) EMOTICON(3) TEXT(4, empty, focused)
     * > User does backspace
     *
     * We should end up with:
     * NEWLINE (1)
     *  TEXT(4, focused)
     *
     * In this case we have merged nodes 2 and 4 to prevent keyboard from flashing/losing focus, but we deleted the emoticon the user wanted to backspace.
     * We also kept the same newline node so the view tree does not completely re-render.
     *
     */

    // if the node to delete is an image, then we can just delete that image, or the row if that's the only thing the row contains.
    // we ignore focus in this case, since the keyboard will already go away if the user has clicked to delete the image :(
    if ('type' in node && (node.type === EditorNodeType.IMAGE || node.type === EditorNodeType.EMOTICON)) {
        const correspondingRow = graph.find((graphEntry) => graphEntry.children?.some((child) => {
            return child.id === node.id;
        }));
        if (correspondingRow && correspondingRow.children!.length === 1) {
            return { // delete whole row
                idsToRemove: [correspondingRow.id]
            };
        } else {
            return {
                idsToRemove: [node.id]
            };
        }
    }

    // This was all just hacked together to make all the tests pass, and more elegant solutions are available.
    console.log('searching', JSON.stringify(graph));
    const searchResult = searchNodesOfTypeBeforeIdInclusive(graph, node.id, EditorNodeTextTypes);
    console.log('searchResult', JSON.stringify(searchResult));
    if (searchResult.nodesInBetween) { // OPTIMIZATION: length check
        if (searchResult.nodesInBetween.length > 1) {
            // nodeIdsInBetween is in reverse order
            const nodeBefore = searchResult.nodesInBetween[0];
            const nodeBeforeBefore = searchResult.nodesInBetween[1];
            const hasConsecutiveNewlines = nodeBefore!.type === EditorNodeType.NEWLINE
                && nodeBeforeBefore!.type === EditorNodeType.NEWLINE;
            if (hasConsecutiveNewlines) {
                plan.idsToRemove = [nodeBefore.id];
                return plan;
            }
        } else if (
            // should merge two text nodes when deleting an empty one before a node with content, resulting in one node
            searchResult.nodesInBetween.length === 1
            && searchResult.start
            && searchResult.end
            && searchResult.startContainer
            && searchResult.nodesInBetween[0].id === searchResult.startContainer.id
        ) {
            plan.idsToRemove = [searchResult.startContainer.id];
            plan.merge = {
                source: searchResult.start,
                target: searchResult.end,
            };
            return plan;
        } else if (
            // should remove an emoticon and merge surrounding text nodes
            searchResult.nodesInBetween.length === 1
            && searchResult.nodesInBetween[0].type !== EditorNodeType.NEWLINE
            && searchResult.start
            && searchResult.end
            && searchResult.startContainer
        ) {
            plan.idsToRemove = [searchResult.start.id, searchResult.nodesInBetween[0].id];
            plan.merge = {
                source: searchResult.start,
                target: searchResult.end,
            };
            return plan;
        } else if (
            // should delete an empty newline before a newline with text, retaining the current newline and text node
            searchResult.nodesInBetween.length === 1
            && searchResult.nodesInBetween[0].type === EditorNodeType.NEWLINE
            && !searchResult.start
            && searchResult.endContainer
            && searchResult.end
            && searchResult.end.id !== focusNode.id
        ) {
            plan.idsToRemove = [searchResult.endContainer.id];
            // no merge. just remove the empty row.
            return plan;
        }
    }

    plan.idsToRemove = searchResult.nodesInBetween && searchResult.nodesInBetween.map((node) => node.id);
    if (searchResult.start && searchResult.end) { // remove the starting node since we'll merge it with the ending node
        if (!plan.idsToRemove) {
            plan.idsToRemove = [searchResult.start.id];
        } else {
            plan.idsToRemove.push(searchResult.start.id);
        }
        if (searchResult.startContainer && searchResult.startContainer.children?.length === 1) {
            plan.idsToRemove.push(searchResult.startContainer.id);
        }
    }

    if (searchResult.endContainer && plan.idsToRemove) {
        plan.idsToRemove = plan.idsToRemove.filter((id) => {
            return id !== searchResult.endContainer!.id
        })
    }

    if (searchResult.end) {
        if (searchResult.start) {
            plan.merge = {
                source: searchResult.start,
                target: searchResult.end,
            }
        }
    }

    return plan;
}

export function deleteNode(nodes: EditorNodeNewLine[], id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id === id);
    if (index > -1) { // if it's a top level node - deletion is quick!
        nodes.splice(index, 1);
    } else {
        // look for child
        for (const node of nodes) {
            if (node.children) {
                const index = node.children.findIndex((searchingNode) => searchingNode.id === id);
                if (index > -1) { // if it's a top level node - deletion is quick!
                    node.children.splice(index, 1);
                    break;
                }
            }
        }
    }
}

/**
 * Try to delete from the current node, while retaining focus so keyboard does not "flash" due to nodes being removed (ie, do in-place replacement).
 */
export function deleteNodeRetainFocus(nodes: EditorNodeNewLine[], node: EditorNodeWithoutChildren, focusNode: EditorNodeWithoutChildren) {
    console.log(`BEGIN deleteNodeRetainFocus id=[${node.id}] type=[${EditorNodeNames[node.type]}] content=[${node.content}]`);

    const plan = getNodeDeletionPlan(nodes, node, focusNode);
    console.log(`PROGRESS deleteNodeRetainFocus PLAN=[${JSON.stringify(plan)}]`);

    if (plan.idsToRemove) {
        for (const id of plan.idsToRemove) {
            deleteNode(nodes, id);
        }
    }

    if (plan.merge) {
        mergeTextNodes(plan.merge);
    }

    console.log(`END deleteNodeRetainFocus id=[${node.id}] type=[${EditorNodeNames[node.type]}] content=[${node.content}]`);
}
