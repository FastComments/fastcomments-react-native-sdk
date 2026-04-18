import type { RNComment } from '../../types/react-native-comment';
import type { FastCommentsStoreState } from '../types';

export interface VisibleEntry {
    id: string;
    depth: number;
}

/**
 * Produces a flat array of visible comment IDs + depth by walking the adjacency maps.
 * O(n) over visible nodes. Stable reference when inputs are referentially unchanged.
 *
 * The collapse logic mirrors the original iterateCommentsTreeWithDepth behavior:
 * a parent with `repliesHidden === true` hides its subtree from the flat list but
 * is still included itself.
 */
export function computeVisibleList(state: FastCommentsStoreState): VisibleEntry[] {
    const { byId, childrenByParent, rootOrder } = state;
    const out: VisibleEntry[] = [];

    const walk = (ids: string[], depth: number) => {
        for (const id of ids) {
            const comment = byId[id];
            if (!comment) continue;
            out.push({ id, depth });
            if (comment.repliesHidden) continue;
            const children = childrenByParent[id];
            if (children && children.length > 0) walk(children, depth + 1);
        }
    };

    walk(rootOrder, 0);
    return out;
}

/**
 * Memoized selector bound to store identity. Produces a new array only when
 * byId / childrenByParent / rootOrder change (Zustand replaces these by reference
 * on every mutation, so referential equality is the right signal).
 */
export function createVisibleListSelector() {
    let lastByIdRef: FastCommentsStoreState['byId'] | undefined;
    let lastChildrenRef: FastCommentsStoreState['childrenByParent'] | undefined;
    let lastRootRef: FastCommentsStoreState['rootOrder'] | undefined;
    let lastResult: VisibleEntry[] = [];

    return (state: FastCommentsStoreState): VisibleEntry[] => {
        if (
            state.byId === lastByIdRef &&
            state.childrenByParent === lastChildrenRef &&
            state.rootOrder === lastRootRef
        ) {
            return lastResult;
        }
        lastByIdRef = state.byId;
        lastChildrenRef = state.childrenByParent;
        lastRootRef = state.rootOrder;
        lastResult = computeVisibleList(state);
        return lastResult;
    };
}

export function getCommentAtEntry(
    state: FastCommentsStoreState,
    entry: VisibleEntry
): RNComment | undefined {
    return state.byId[entry.id];
}
