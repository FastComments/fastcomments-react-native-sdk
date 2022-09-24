/**
 * Which node should we focus on after delete?
 */
import {insertAfter} from "./node-insert";
import {createTextNode} from "./node-create";
import {focusNode} from "./node-focus";
import {EditorNodeDefinition, EditorNodeNames, EditorNodeTextTypes, EditorNodeType} from "./node-types";

interface EditorNodeMergePlan {
    source: EditorNodeDefinition
    target: EditorNodeDefinition
}

interface EditorNodeDeletionPlan {
    idsToRemove?: number[]
    nodeToAdd?: {
        afterId?: number
        node: EditorNodeDefinition // could be same as nodeToFocus
    }
    nodeToFocus?: EditorNodeDefinition
    merge?: EditorNodeMergePlan
}

// right now this just supports text, but that's all we need to merge
function mergeTextNodes(mergePlan: EditorNodeMergePlan) {
    mergePlan.target.content = mergePlan.source.content;
    mergePlan.target.type = mergePlan.source.type; // for example: backspacing BOLD into TEXT. Want to get rid of BOLD.
}

interface NodeSearchResult {
    start?: EditorNodeDefinition
    end?: EditorNodeDefinition
    nodesInBetween?: EditorNodeDefinition[]
}

function searchNodesOfTypeBeforeIdInclusive(nodes: EditorNodeDefinition[], fromId: number, types: EditorNodeType[]): NodeSearchResult {
    const result: NodeSearchResult = {};

    let index = nodes.findIndex((searchingNode) => searchingNode.id === fromId);
    console.log('starting index', index, fromId);
    while (index > -1) {
        const node = nodes[index];
        console.log('checking', index, node);
        if (!node) {
            continue
        }
        if (result.end) {
            if (types.includes(node.type)) {
                result.start = node;
                break;
            } else {
                if (!result.nodesInBetween) {
                    result.nodesInBetween = [node];
                } else {
                    result.nodesInBetween.push(node);
                }
            }
        } else if (types.includes(node.type)) {
            result.end = node;
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
 *
 * This assumes the node to delete is also the node in focus, since we only delete via backspace right now.
 */
function getNodeDeletionPlan(nodes: EditorNodeDefinition[], node: EditorNodeDefinition): EditorNodeDeletionPlan {
    const plan: EditorNodeDeletionPlan = {};

    /**
     * First find the closest text node, assuming node to delete is not that.
     * Traverse the node list until we find another text node.
     * Delete everything in between, and then merge the text nodes. and remove the first one.
     *
     * We will delete all nodes between the current one and that one. So for example:
     * TEXT (id 1)
     * NEWLINE
     * TEXT (id 2)
     * NEWLINE
     * IMAGE
     * NEWLINE
     * TEXT (id 3, focused)
     * > User does backspace
     *
     * We should end up with:
     * TEXT (id 1)
     * NEWLINE
     * TEXT (id 3)
     *
     * In this case we have merged nodes 2 and 3 to prevent keyboard from flashing/losing focus.
     *
     * In the case of emoticons:
     * TEXT(1) EMOTICON(2) TEXT(3, empty, focused)
     * > User does backspace
     *
     * We should end up with:
     * TEXT(3)
     *
     * In this case we have merged nodes 1 and 3 to prevent keyboard from flashing/losing focus.
     *
     */

    const searchResult = searchNodesOfTypeBeforeIdInclusive(nodes, node.id, EditorNodeTextTypes);
    // console.log('searchResult', JSON.stringify(searchResult));
    if (searchResult.nodesInBetween && searchResult.nodesInBetween.length > 1) { // OPTIMIZATION: length check
        // nodeIdsInBetween is in reverse order
        const nodeBefore = searchResult.nodesInBetween[0];
        const nodeBeforeBefore = searchResult.nodesInBetween[1];
        const hasConsecutiveNewlines = nodeBefore!.type === EditorNodeType.NEWLINE
            && nodeBeforeBefore!.type === EditorNodeType.NEWLINE;
        if (hasConsecutiveNewlines) {
            plan.idsToRemove = [nodeBefore.id];
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
    }

    if (searchResult.end) {
        if (searchResult.start) {
            plan.nodeToFocus = searchResult.end;
            plan.merge = {
                source: searchResult.start,
                target: searchResult.end,
            }
        } else {
            plan.nodeToFocus = searchResult.end;
        }
    } else {
        const newTextNode = createTextNode('');
        plan.nodeToFocus = newTextNode;
        plan.nodeToAdd = {
            node: newTextNode
        }
    }

    return plan;
}

export function deleteNode(nodes: EditorNodeDefinition[], id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id === id);
    if (index > -1) {
        nodes.splice(index, 1);
    }
}

/**
 * Try to delete from the current node, while retaining focus so keyboard does not "flash" due to nodes being removed (ie, do in-place replacement).
 * This assumes the node to delete is also the node in focus, since we only delete via backspace right now.
 */
export function deleteNodeRetainFocus(nodes: EditorNodeDefinition[], node: EditorNodeDefinition) {
    console.log(`BEGIN deleteNodeRetainFocus id=[${node.id}] type=[${EditorNodeNames[node.type]}] content=[${node.content}]`);

    const plan = getNodeDeletionPlan(nodes, node);
    console.log(`PROGRESS deleteNodeRetainFocus PLAN=[${JSON.stringify(plan)}]`);

    if (plan.idsToRemove) {
        for (const id of plan.idsToRemove) {
            deleteNode(nodes, id);
        }
    }

    if (plan.nodeToAdd) {
        if (plan.nodeToAdd.afterId !== undefined) {
            insertAfter(nodes, plan.nodeToAdd.afterId, plan.nodeToAdd.node);
        } else {
            nodes.push(plan.nodeToAdd.node);
        }
    }

    if (plan.merge) {
        mergeTextNodes(plan.merge);
    }

    if (plan.nodeToFocus) {
        if (node.id === plan.nodeToFocus.id && node.isFocused && plan.nodeToFocus.lastFocusTime) {
            // if we update lastFocusTime then keyboard will go away/show again and feel weird.
            console.log('Not re-focusing node after deletion, already focused.');
            plan.nodeToFocus.isFocused = true; // ensure focused after merge
        } else {
            for (const node of nodes) {
                if (!node) { continue }
                node.isFocused = false;
            }
            focusNode(plan.nodeToFocus);
        }
    }

    console.log(`END deleteNodeRetainFocus id=[${node.id}] type=[${EditorNodeNames[node.type]}] content=[${node.content}]`);
}
