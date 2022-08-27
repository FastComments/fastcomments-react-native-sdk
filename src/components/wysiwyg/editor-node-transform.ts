import {EditorNodeDefinition, EditorNodeType} from "./editor-node";
import {none, State} from "@hookstate/core";

export interface EditorFormatConfiguration {
    /** How many characters does an image take up? Set to zero to disable validation. **/
    imageLength?: number
    /** How many characters does an emoticon take up? Set to zero to disable validation. **/
    emoticonLength?: number
    tokenize: (input: string) => EditorNodeDefinition[]
    formatters: Record<EditorNodeType, (node: EditorNodeDefinition, trimToLength?: number) => string>
}

export interface SupportedNodeDefinition {
    start: string
    end?: string
    type: EditorNodeType
    // internal
    lookaheadIgnore: null | string[]
}

export type SupportedNodesTokenizerConfig = Record<string, SupportedNodeDefinition>;

export function stringToNodes(formatConfig: EditorFormatConfiguration, input: string): EditorNodeDefinition[] {
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

export function deleteNode(nodes: State<EditorNodeDefinition[]>, id: number) {
    const index = nodes.findIndex((searchingNode) => searchingNode.id.get() === id);
    console.log('found index to remove at', index); // TODO REMOVE
    const before = nodes[index - 1];
    const after = nodes[index + 1];
    if (before && before.get()) {
        before.merge({
            next: after ? after.get() : undefined
        })
    }
    if (after && after.get()) {
        after.merge({
            prev: before ? before.get() : undefined
        })
    }
    nodes[index].set(none);
}

/**
 * This function is not purely functional for performance reasons. That's why it takes a State<T>.
 * Note: length is based on the content the user sees, not the resulting representation. You should handle this validation server-side.
 */
export function nodesToString(nodes: State<EditorNodeDefinition[]>, formatConfig: Pick<EditorFormatConfiguration, 'formatters' | 'imageLength' | 'emoticonLength'>, maxLength?: number | null): string {
    let content = '';
    let length = 0;
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
                        deleteNode(nodes, rawNode.id); // example: empty image node does not make sense
                        // OPTIMIZATION: we don't need to do anything here with length because we're going to stop iteration.
                    }
                    break;
                } else {
                    deleteNode(nodes, rawNode.id); // example: empty image node does not make sense
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

export function defaultTokenizer(input: string, SupportedNodes: SupportedNodesTokenizerConfig) {
    console.log('calling defaultTokenizer', input);
    const result: EditorNodeDefinition[] = [];
    let buffer = '';

    let inNode = null;
    let id = -1;

    for (let i = 0; i < input.length; i++) {
        buffer += input[i];

        if (inNode) {
            if (inNode.end && buffer.endsWith(inNode.end)) {
                id++;
                result.push({
                    id,
                    type: inNode.type,
                    content: buffer.substr(0, buffer.length - inNode.end.length),
                    isFocused: false
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
                        id++;
                        result.push({
                            id,
                            type: EditorNodeType.TEXT,
                            content: buffer.substr(0, buffer.length - startToken.length),
                            isFocused: false
                        });
                    }
                    if (!node.end) { // some node types like newlines do not have ends
                        id++;
                        result.push({
                            id,
                            type: node.type,
                            content: buffer.substr(0, buffer.length - startToken.length),
                            isFocused: false
                        });
                        inNode = null;
                    }
                    buffer = '';
                }
            }
        }
    }
    if (buffer.length > 0) {
        id++;
        result.push({
            id,
            type: EditorNodeType.TEXT,
            content: buffer,
            isFocused: false
        });
    }
    // setup linked list (MAYBE OPTIMIZE: this could be done in the above loops to optimize but correctness would be a pain)
    for (let i = 0; i < result.length; i++) {
        const prev = result[i - 1];
        const next = result[i + 1];
        if (prev) {
            result[i].prev = prev;
        }
        if (next) {
            result[i].next = next;
        }
    }
    if (result.length === 0) {
        id++;
        result.push({
            id,
            type: EditorNodeType.TEXT,
            content: '',
            isFocused: false
        });
    }
    return result;
}

export function toTextTrimmed(node: Pick<EditorNodeDefinition, 'content'>, startToken?: string | null, endToken?: string | null, trimToLength?: number) {
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
