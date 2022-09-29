import {none, State} from "@hookstate/core";
import {getNextNodeId} from "./node-id";
import {EditorNodeNewLine, EditorNodeType, EditorNodeWithoutChildren} from "./node-types";
import {graphToListStateWithNewlines} from "./node-navigate";

export interface EditorFormatConfiguration {
    /** How many characters does an image take up? Set to zero to disable validation. **/
    imageLength?: number
    /** How many characters does an emoticon take up? Set to zero to disable validation. **/
    emoticonLength?: number
    tokenize: (input: string) => (EditorNodeNewLine)[]
    formatters: Record<EditorNodeType, (node: EditorNodeNewLine | EditorNodeWithoutChildren, trimToLength?: number) => string>
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

export function getNodeLength(type: EditorNodeType, content: string, config: Pick<EditorFormatConfiguration, 'imageLength' | 'emoticonLength'>) {
    if (type === EditorNodeType.EMOTICON) {
        return config.emoticonLength || 0;
    }
    if (type === EditorNodeType.IMAGE) {
        return config.imageLength || 0;
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
 * This function is not purely functional for performance reasons. That's why it takes a State<T>.
 * Note: length is based on the content the user sees, not the resulting representation. You should handle this validation server-side.
 */
export function graphToString(graph: State<EditorNodeNewLine[]> | null, formatConfig: Pick<EditorFormatConfiguration, 'formatters' | 'imageLength' | 'emoticonLength'>, maxLength?: number | null): string {
    let content = '';
    if (!graph) {
        return content;
    }
    let length = 0;
    const nodes = graphToListStateWithNewlines(graph);
    for (const node of nodes) {
        const rawNode = node.get();
        if (!rawNode || rawNode === none) {
            continue;
        }
        // It really sucks that we have to do so many hashmap lookups due to the performance overhead, but not sure how else to make the library
        // be flexible. If you aren't getting the performance needed, maybe we could maintain a fork that uses a switch() to try to get the JIT to
        // create a jump table. We can't maintain a reference to a function on EditorNodeDefinition because serializing functions breaks usehookstate.
        const formattedValue = formatConfig.formatters[rawNode.type](rawNode);
        // OPTIMIZATION checking maxLength before doing type + EditorNodeType property lookup
        if (maxLength) {
            length += getNodeLength(rawNode.type, rawNode.content, formatConfig);
        }
        content += formattedValue;
    }
    // OPTIMIZATION - we only do this *after* creating the content as it's a less common scenario than just typing within limits
    if (maxLength && length > maxLength) {
        // recalculate content and trim
        content = '';
        length = 0;
        for (const node of nodes) {
            const rawNode = node.get();
            if (!rawNode || rawNode === none) {
                continue;
            }
            const nodeLength = getNodeLength(rawNode.type, rawNode.content, formatConfig);

            // if adding this node would exceed the max length - add what we can and break.
            if (length + nodeLength > maxLength) {
                const remainingLength = maxLength - length;
                if (remainingLength > 0) {
                    console.log('???', rawNode.type, typeof formatConfig.formatters[rawNode.type]);
                    const trimmedFormattedValue = formatConfig.formatters[rawNode.type](rawNode, remainingLength);
                    if (trimmedFormattedValue) {
                        node.content.set(trimmedFormattedValue);
                        content += trimmedFormattedValue;
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    } else {
                        deleteNodeState(nodes, rawNode.id); // example: empty image node does not make sense
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    }
                    break;
                } else {
                    deleteNodeState(nodes, rawNode.id); // example: empty image node does not make sense
                    // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    break;
                }
            } else {
                console.log('???', rawNode.type, typeof formatConfig.formatters[rawNode.type]);
                const fullFormattedValue = formatConfig.formatters[rawNode.type](rawNode);
                content += fullFormattedValue;
            }
        }
    }
    return content;
}

/**
 * This function is not purely functional for performance reasons. That's why it takes a State<T>.
 * Note: length is based on the content the user sees, not the resulting representation. You should handle this validation server-side.
 */
export function enforceMaxLength(nodes: State<EditorNodeNewLine[]>, formatConfig: Pick<EditorFormatConfiguration, 'formatters' | 'imageLength' | 'emoticonLength'>, maxLength?: number | null): boolean {
    let length = 0;
    let isEmpty = true;
    for (const node of nodes) {
        const rawNode = node.get();
        if (!rawNode || rawNode === none) {
            continue;
        }
        if (rawNode.content) {
            isEmpty = false;
        }
        // It really sucks that we have to do so many hashmap lookups due to the performance overhead, but not sure how else to make the library
        // be flexible. If you aren't getting the performance needed, maybe we could maintain a fork that uses a switch() to try to get the JIT to
        // create a jump table. We can't maintain a reference to a function on EditorNodeDefinition because serializing functions breaks usehookstate.
        // OPTIMIZATION checking maxLength before doing type + EditorNodeType property lookup
        if (maxLength) {
            length += getNodeLength(rawNode.type, rawNode.content, formatConfig);
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
            const nodeLength = getNodeLength(rawNode.type, rawNode.content, formatConfig);

            // if adding this node would exceed the max length - add what we can and break.
            if (length + nodeLength > maxLength) {
                const remainingLength = maxLength - length;
                if (remainingLength > 0) {
                    const trimmedFormattedValue = formatConfig.formatters[rawNode.type](rawNode, remainingLength);
                    if (trimmedFormattedValue) {
                        node.content.set(trimmedFormattedValue);
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    } else {
                        deleteNodeState(nodes, rawNode.id); // example: empty image node does not make sense
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    }
                    break;
                } else {
                    deleteNodeState(nodes, rawNode.id); // example: empty image node does not make sense
                    // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    break;
                }
            }
        }
    }
    return isEmpty;
}

// TODO HACK
function isMention(type: EditorNodeType, text: string) {
    return type === EditorNodeType.TEXT_BOLD && text.startsWith('@') && text.length < 300;
}

export function defaultTokenizer(input: string, SupportedNodes: SupportedNodesTokenizerConfig) {
    console.log('calling defaultTokenizer', input);
    const result: EditorNodeNewLine[] = [];
    let buffer = '';

    let inNode = null;

    const inputLength = input.length; // don't re-read input length on every iteration
    for (let i = 0; i < inputLength; i++) {
        buffer += input[i];

        if (inNode) {
            if (inNode.end && buffer.endsWith(inNode.end)) {
                const content = buffer.substr(0, buffer.length - inNode.end.length);
                result.push({
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
                    inNode = node;
                    if (buffer.length - startToken.length > 0) {
                        const content = buffer.substr(0, buffer.length - startToken.length); // TODO replace substr with substring
                        result.push({
                            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
                            type: EditorNodeType.TEXT,
                            content,
                            isFocused: false
                        });
                    }
                    if (!node.end) { // some node types like newlines do not have ends
                        const content = buffer.substr(0, buffer.length - startToken.length); // TODO replace substr with substring
                        result.push({
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
        result.push({
            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
            type: EditorNodeType.TEXT,
            content: buffer,
            isFocused: false
        });
    }
    if (result.length === 0) {
        result.push({
            id: getNextNodeId(), // we do this so react knows to re-render via key, since we use id as key. If we just use an incrementing number here, react may not re-render for a whole new tree.
            type: EditorNodeType.TEXT,
            content: '',
            isFocused: false
        });
    }
    console.log('Tokenizer', input, '->', result);
    return result;
}

export function toTextTrimmed(node: Pick<EditorNodeNewLine, 'content'>, startToken?: string | null, endToken?: string | null, trimToLength?: number) {
    const result = trimToLength ? node.content.substr(0, trimToLength) : node.content;
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
