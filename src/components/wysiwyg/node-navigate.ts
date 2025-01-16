import {ImmutableArray, ImmutableObject, none, State} from "@hookstate/core";
import {EditorNodeNewLine, EditorNodeWithoutChildren} from "./node-types";

// We used to use a doubly linked list but it was a huge pain.

export function graphToListStateWithNewlines(nodes: State<EditorNodeNewLine[]>): (State<EditorNodeNewLine> | State<EditorNodeWithoutChildren>)[] {
    const result: (State<EditorNodeNewLine> | State<EditorNodeWithoutChildren>)[] = [];
    for (const node of nodes) {
        result.push(node);
        if (node.children) {
            (node.children as State<EditorNodeWithoutChildren[]>).forEach(function (child) {
                result.push(child);
            });
        }
    }
    return result;
}

export function graphToListStateWithoutNewlines(nodes: State<EditorNodeNewLine[]>): State<EditorNodeWithoutChildren>[] {
    const result: State<EditorNodeWithoutChildren>[] = [];
    for (const node of nodes) {
        if (node.children) {
            (node.children as State<EditorNodeWithoutChildren[]>).forEach(function (child) {
                result.push(child);
            });
        }
    }
    return result;
}

export function graphToListWithNewlines(nodes: ImmutableArray<EditorNodeNewLine>): ImmutableObject<(EditorNodeNewLine | EditorNodeWithoutChildren)>[] {
    const result: ImmutableObject<(EditorNodeNewLine | EditorNodeWithoutChildren)>[] = [];
    for (const node of nodes) {
        result.push(node);
        if (node.children) {
            (node.children as EditorNodeWithoutChildren[]).forEach(function (child) {
                result.push(child);
            });
        }
    }
    return result;
}

// just easier type system wise if this is its own thing
export function graphToListWithoutNewlines(nodes: EditorNodeNewLine[]): EditorNodeWithoutChildren[] {
    const result: (EditorNodeNewLine | EditorNodeWithoutChildren)[] = [];
    for (const node of nodes) {
        if (node.children) {
            (node.children as EditorNodeWithoutChildren[]).forEach(function (child) {
                result.push(child);
            });
        }
    }
    return result as EditorNodeWithoutChildren[];
}

export function getStatePrev(nodes: State<EditorNodeNewLine[]>, id: number): State<EditorNodeWithoutChildren> | null {
    const list = graphToListStateWithoutNewlines(nodes);
    const index = list.findIndex((searchingNode) => searchingNode.id.get() === id);
    // without this check - weird behavior in delete flow
    if (index - 1 < 0) {
        return null;
    }
    return list[index - 1] as State<EditorNodeWithoutChildren>;
}

export function getStateNext(nodes: State<EditorNodeNewLine[]>, id: number): State<EditorNodeWithoutChildren> | null {
    const list = graphToListStateWithoutNewlines(nodes);
    const index = list.findIndex((searchingNode) => searchingNode.id.get() === id);
    // without this check - weird behavior in delete flow
    if (index + 1 > list.length - 1) {
        return null;
    }
    return list[index + 1] as State<EditorNodeWithoutChildren>;
}

// we should always have a node (at least a text node) so this should never return null! otherwise is a bug.
export function getStateLast(nodes: State<EditorNodeNewLine[]>): State<EditorNodeWithoutChildren> {
    let newlineCount = nodes.length;
    while (newlineCount--) {
        const line = nodes[newlineCount];
        if (line && line !== none && line.children && line.children!.get()!.length > 0) {
            // @ts-ignore fuck typescript
            return line.children[line.children.length - 1];
        }
    }
    throw new Error('getStateLast could not find a visible node other than a newline! This should not happen.');
}

// we should always have a node (at least a text node) so this should never return null! otherwise is a bug.
export function getLast(nodes: EditorNodeNewLine[]): EditorNodeWithoutChildren {
    let newlineCount = nodes.length;
    while (newlineCount--) {
        const line = nodes[newlineCount];
        if (line && line !== none && line.children && line.children!.length > 0) {
            // @ts-ignore fuck typescript
            return line.children[line.children.length - 1];
        }
    }
    throw new Error('getLast could not find a visible node other than a newline! This should not happen.');
}

export function getNext(nodes: EditorNodeNewLine[], id: number): EditorNodeWithoutChildren | null {
    const list = graphToListWithoutNewlines(nodes);
    const index = list.findIndex((searchingNode) => searchingNode.id === id);
    // without this check - weird behavior in delete flow
    if (index + 1 > list.length - 1) {
        return null;
    }
    return list[index + 1];
}

export function getPrev(nodes: EditorNodeNewLine[], id: number): EditorNodeWithoutChildren | null {
    const list = graphToListWithoutNewlines(nodes);
    const index = list.findIndex((searchingNode) => searchingNode.id === id);
    // without this check - weird behavior in delete flow
    if (index - 1 < 0) {
        return null;
    }
    return list[index - 1];
}

export function getStateByIdFromMap(nodes: Record<string, State<EditorNodeWithoutChildren>>, id: number) {
    return nodes[id];
}

export function getLastFocused(graph: EditorNodeNewLine[]) {
    // MAYBE OPTIMIZE: we had a ton of problems with keeping track of the last selected node with storing references to a raw js object or State<>
    //  due to hookstatejs (or maybe not using it correctly). Maybe a React expert can help us :)
    //  UPDATE: Probably way to do it is editorState = { lastNode?: Node } - this way optionals are supported via usehookstate
    const hasBeenFocused = graphToListWithoutNewlines(graph);
    if (hasBeenFocused.length === 0) {
        // it really feels like we are using the library wrong if we have to cast like this?
        const children = graph[0].children; // we ALWAYS have a root node
        if (children && children.length > 0) {
            return children[0];
        } else {
            throw new Error('Could not determine current node!!!'); // if this happens it's a bug.
        }
    }
    hasBeenFocused.sort((a, b) => {
        return b.lastFocusTime! - a.lastFocusTime!;
    });
    return hasBeenFocused[0];
}

export function getLastFocusedState(graph: State<EditorNodeNewLine[]>) {
    // MAYBE OPTIMIZE: we had a ton of problems with keeping track of the last selected node with storing references to a raw js object or State<>
    //  due to hookstatejs (or maybe not using it correctly). Maybe a React expert can help us :)
    //  UPDATE: Probably way to do it is editorState = { lastNode?: Node } - this way optionals are supported via usehookstate
    const hasBeenFocused = graphToListStateWithoutNewlines(graph);
    if (hasBeenFocused.length === 0) {
        // it really feels like we are using the library wrong if we have to cast like this?
        const children = graph[0].children as unknown as State<EditorNodeWithoutChildren>[]; // we ALWAYS have a root node
        if (children && children.length > 0) {
            return children[0];
        } else {
            throw new Error('Could not determine current node!!!'); // if this happens it's a bug.
        }
    }
    hasBeenFocused.sort((a, b) => {
        return b.lastFocusTime.get({stealth: true})! - a.lastFocusTime.get({stealth: true})!;
    });
    return hasBeenFocused[0];
}
