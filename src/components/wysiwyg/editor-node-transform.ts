import {none, State} from "@hookstate/core";
import {getNextNodeId} from "./node-id";
import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";
import {graphToListStateWithoutNewlines, graphToListWithNewlines} from "./node-navigate";
import {deleteNodeRetainFocus} from "./node-delete";
import {createNewlineNode} from "./node-create";
import {focusNode} from "./node-focus";

export interface EditorFormatConfiguration {
    /** How many characters does an image take up? Set to zero to disable validation. **/
    imageLength?: number
    /** How many characters does an emoticon take up? Set to zero to disable validation. **/
    emoticonLength?: number
    tokenize: (input: string) => (EditorNodeNewLine)[]
    formatters: Record<EditorNodeType, (node: EditorNodeWithoutChildren | EditorNodeNewLine, trimToLength?: number) => string>
}

export interface SupportedNodeDefinition {
    start: string
    end?: string
    type: EditorNodeType
    // internal
    lookaheadIgnore: null | string[]
}

export type SupportedNodesTokenizerConfig = Record<string, SupportedNodeDefinition>;

export function stringToNodes(formatConfig: EditorFormatConfiguration, input: string): EditorNodeNewLine[] {
    return formatConfig.tokenize(input);
}

export function getNodeLength(type: EditorNodeType, content: string | undefined, config: Pick<EditorFormatConfiguration, 'imageLength' | 'emoticonLength'>) {
    if (type === EditorNodeType.EMOTICON) {
        return config.emoticonLength || 0;
    }
    if (type === EditorNodeType.IMAGE) {
        return config.imageLength || 0;
    }
    if (!content) {
        return 0;
    }
    return content.length;
}

export function deleteNodeState(nodes: State<EditorNodeNewLine[]>, id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id.get() === id);
    console.log('Removing (index, id)', index, id);
    nodes[index].set(none);
    console.log('Done removing (index, id)', index, id);
}

/**
 * Note: length is based on the content the user sees, not the resulting representation. You should handle this validation server-side.
 */
export function graphToString(graph: EditorNodeNewLine[] | null, formatConfig: Pick<EditorFormatConfiguration, 'formatters' | 'imageLength' | 'emoticonLength'>, maxLength?: number | null): string {
    let content = '';
    if (!graph) {
        return content;
    }
    let length = 0;
    const nodes = graphToListWithNewlines(graph);
    for (const node of nodes) {
        if (!node || node === none) {
            continue;
        }
        // It really sucks that we have to do so many hashmap lookups due to the performance overhead, but not sure how else to make the library
        // be flexible. If you aren't getting the performance needed, maybe we could maintain a fork that uses a switch() to try to get the JIT to
        // create a jump table. We can't maintain a reference to a function on EditorNodeDefinition because serializing functions breaks usehookstate.
        const formattedValue = formatConfig.formatters[node.type](node);
        // OPTIMIZATION checking maxLength before doing type + EditorNodeType property lookup
        if (maxLength) {
            length += getNodeLength(node.type, 'content' in node ? node.content : undefined, formatConfig);
        }
        content += formattedValue;
    }
    // OPTIMIZATION - we only do this *after* creating the content as it's a less common scenario than just typing within limits
    if (maxLength && length > maxLength) {
        // recalculate content and trim
        content = '';
        length = 0;
        for (const node of nodes) {
            if (!node || node === none) {
                continue;
            }
            const nodeLength = getNodeLength(node.type, 'content' in node ? node.content : undefined, formatConfig);

            // if adding this node would exceed the max length - add what we can and break.
            if (length + nodeLength > maxLength) {
                const remainingLength = maxLength - length;
                if (remainingLength > 0) {
                    // console.log('???', node.type, typeof formatConfig.formatters[node.type]);
                    const trimmedFormattedValue = formatConfig.formatters[node.type](node, remainingLength);
                    if (trimmedFormattedValue) {
                        // if we wanted to, we could trim the node in the graph here, too, but this might be a weird experience for the user.
                        content += trimmedFormattedValue;
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    } else {
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                        // empty image node does not make sense. We could remove the image here if we wanted to.
                    }
                    break;
                } else {
                    // empty image node does not make sense. We could remove the image here if we wanted to.
                    // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    break;
                }
            } else {
                // console.log('???', node.type, typeof formatConfig.formatters[node.type]);
                const fullFormattedValue = formatConfig.formatters[node.type](node);
                content += fullFormattedValue;
            }
        }
    }
    console.log('END graph to string')
    return content;
}

/**
 * This function is not purely functional for performance reasons. That's why it takes a State<T>.
 * Note: length is based on the content the user sees, not the resulting representation. You should handle this validation server-side.
 */
export function enforceMaxLength(graph: State<EditorNodeNewLine[]>, formatConfig: Pick<EditorFormatConfiguration, 'formatters' | 'imageLength' | 'emoticonLength'>, maxLength?: number | null): boolean {
    let length = 0;
    let isEmpty = true;

    const nodes = graphToListStateWithoutNewlines(graph);
    for (const node of nodes) {
        const rawNode = node.get();
        if (!rawNode || rawNode === none) {
            continue;
        }
        let nodeContent = 'content' in rawNode ? rawNode.content : undefined;
        if (nodeContent) {
            isEmpty = false;
        }
        // It really sucks that we have to do so many hashmap lookups due to the performance overhead, but not sure how else to make the library
        // be flexible. If you aren't getting the performance needed, maybe we could maintain a fork that uses a switch() to try to get the JIT to
        // create a jump table. We can't maintain a reference to a function on EditorNodeDefinition because serializing functions breaks usehookstate.
        // OPTIMIZATION checking maxLength before doing type + EditorNodeType property lookup
        if (maxLength) {
            length += getNodeLength(rawNode.type, nodeContent, formatConfig);
        }
    }
    // OPTIMIZATION - we only do this *after* creating the content as it's a less common scenario than just typing within limits
    if (maxLength && length > maxLength) {
        // recalculate content and trim
        length = 0;
        for (const node of nodes) {
            const rawNode = node.get();
            if (!rawNode || rawNode === none) {
                continue;
            }
            const nodeLength = getNodeLength(rawNode.type, 'content' in rawNode ? rawNode.content : undefined, formatConfig);

            // if adding this node would exceed the max length - add what we can and break.
            if (length + nodeLength > maxLength) {
                const remainingLength = maxLength - length;
                if (remainingLength > 0) {
                    const trimmedFormattedValue = formatConfig.formatters[rawNode.type](rawNode, remainingLength);
                    if (trimmedFormattedValue) {
                        node.content.set(trimmedFormattedValue);
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    } else {
                        graph.set((graph) => {
                            deleteNodeRetainFocus(graph, rawNode, rawNode); // example: empty image node does not make sense
                            return graph;
                        });
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    }
                    break;
                } else {
                    graph.set((graph) => {
                        deleteNodeRetainFocus(graph, rawNode, rawNode); // example: empty image node does not make sense
                        return graph;
                    });
                    // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    break;
                }
            }
        }
    }
    return isEmpty;
}

export function hasContent(graph: EditorNodeNewLine[]) {
    for (const newline of graph) {
        if (newline.children) {
            for (const child of newline.children) {
                if (child.content) {
                    return true;
                }
            }
        }
    }
    return false;
}

// HACK
function isMention(type: EditorNodeType, text: string) {
    return type === EditorNodeType.TEXT_BOLD && text.startsWith('@') && text.length < 300;
}

export function defaultTokenizer(input: string, SupportedNodes: SupportedNodesTokenizerConfig) {
    console.log('calling defaultTokenizer', input);
    const result: EditorNodeNewLine[] = [];
    let buffer = '';

    let inNode = null;
    let currentNewLine = createNewlineNode([]);

    const inputLength = input.length; // don't re-read input length on every iteration
    for (let i = 0; i < inputLength; i++) {
        buffer += input[i];

        if (inNode) {
            if (inNode.end && buffer.endsWith(inNode.end)) {
                const content = buffer.substring(0, buffer.length - inNode.end.length);
                currentNewLine.children!.push({
                    id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                    type: inNode.type,
                    content,
                    isFocused: false,
                    deleteOnBackspace: isMention(inNode.type, content)
                });
                inNode = null;
                buffer = '';
            }
        } else {
            for (const startToken in SupportedNodes) {
                if (buffer.endsWith(startToken)) {
                    // @ts-ignore
                    const node = SupportedNodes[startToken];
                    if (node.lookaheadIgnore && input[i + 1] && node.lookaheadIgnore.some((ignore) => ignore === input[i + 1])) {
                        continue;
                    }
                    if (node.type === EditorNodeType.NEWLINE) {
                        const content = buffer.substring(0, buffer.length - startToken.length);
                        if (content.length > 0) {
                            currentNewLine.children!.push({
                                id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                                type: EditorNodeType.TEXT,
                                content,
                                isFocused: false,
                                deleteOnBackspace: isMention(node.type, content)
                            });
                        }
                        inNode = null;
                        buffer = '';
                        result.push(currentNewLine);
                        currentNewLine = createNewlineNode([]);
                        continue;
                    }
                    inNode = node;
                    if (buffer.length - startToken.length > 0) {
                        const content = buffer.substring(0, buffer.length - startToken.length);
                        currentNewLine.children!.push({
                            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                            type: EditorNodeType.TEXT,
                            content,
                            isFocused: false
                        });
                    }
                    if (!node.end) { // some node types like newlines do not have ends
                        const content = buffer.substring(0, buffer.length - startToken.length);
                        currentNewLine.children!.push({
                            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                            type: node.type,
                            content,
                            isFocused: false,
                            deleteOnBackspace: isMention(node.type, content)
                        });
                        inNode = null;
                    }
                    buffer = '';
                }
            }
        }
    }
    if (buffer.length > 0) {
        currentNewLine.children!.push({
            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
            type: EditorNodeType.TEXT,
            content: buffer,
            isFocused: false
        });
        result.push(currentNewLine);
    }
    if (result.length === 0) {
        if (currentNewLine.children!.length === 0) {
            const emptyTextNode = {
                id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                type: EditorNodeType.TEXT,
                content: '',
                isFocused: true
            };
            focusNode(emptyTextNode);
            currentNewLine.children!.push(emptyTextNode);
        }
        result.push(currentNewLine);
    }
    console.log('Tokenizer', input, '->', JSON.stringify(result));
    return result;
}

export function toTextTrimmed(node: EditorNodeNewLine | Pick<EditorNodeWithoutChildren, 'content'>, startToken?: string | null, endToken?: string | null, trimToLength?: number) {
    if (!('content' in node)) {
        return '';
    }
    const result = trimToLength ? node.content.substring(0, trimToLength) : node.content;
    if (!startToken && !endToken) {
        return result;
    }

    // count spaces before and after, then add them before and after the tokens.
    let spacesBefore = '';
    for (let i = 0; i < result.length; i++) {
        if (result[i] === ' ') {
            spacesBefore += ' ';
        } else {
            break;
        }
    }
    let spacesAfter = '';
    for (let i = result.length; i > 0; i--) {
        if (result[i] === ' ') {
            spacesAfter += ' ';
        } else {
            break;
        }
    }

    return spacesBefore + startToken + result.trim() + endToken + spacesAfter;
}
