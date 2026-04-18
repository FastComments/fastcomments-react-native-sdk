import type { StateCreator } from 'zustand';
import type { FastCommentsBadge } from 'fastcomments-typescript';
import type { RNComment } from '../../types/react-native-comment';
import type { CommentsSlice, FastCommentsStoreState } from '../types';
import { ROOT_PARENT_KEY } from '../types';

function addToUserIndex(
    index: Record<string, Set<string>>,
    userId: string | undefined,
    commentId: string
) {
    if (!userId) return;
    const existing = index[userId];
    if (existing) {
        existing.add(commentId);
    } else {
        index[userId] = new Set([commentId]);
    }
}

function removeFromUserIndex(
    index: Record<string, Set<string>>,
    userId: string | undefined,
    commentId: string
) {
    if (!userId) return;
    const existing = index[userId];
    if (!existing) return;
    existing.delete(commentId);
    if (existing.size === 0) {
        delete index[userId];
    }
}

function insertRoot(
    rootOrder: string[],
    pinnedIds: Set<string>,
    byId: Record<string, RNComment>,
    commentId: string,
    isPinned: boolean,
    newCommentsToBottom: boolean
): string[] {
    if (isPinned) {
        const firstNonPinned = rootOrder.findIndex((id) => !pinnedIds.has(id));
        const insertAt = firstNonPinned === -1 ? rootOrder.length : firstNonPinned;
        const next = rootOrder.slice();
        next.splice(insertAt, 0, commentId);
        return next;
    }
    // Non-pinned comments: pinned comments stay at the head; new ones go to start or end of
    // the non-pinned section.
    if (newCommentsToBottom) {
        return rootOrder.concat(commentId);
    }
    const firstNonPinned = rootOrder.findIndex((id) => !pinnedIds.has(id));
    const insertAt = firstNonPinned === -1 ? rootOrder.length : firstNonPinned;
    const next = rootOrder.slice();
    next.splice(insertAt, 0, commentId);
    return next;
}

function insertChild(
    childrenByParent: Record<string, string[]>,
    parentId: string,
    commentId: string,
    newCommentsToBottom: boolean
): Record<string, string[]> {
    const existing = childrenByParent[parentId];
    const nextList = existing
        ? newCommentsToBottom
            ? existing.concat(commentId)
            : [commentId, ...existing]
        : [commentId];
    return { ...childrenByParent, [parentId]: nextList };
}

function removeFromArray(arr: string[] | undefined, id: string): string[] | undefined {
    if (!arr) return arr;
    const idx = arr.indexOf(id);
    if (idx === -1) return arr;
    const next = arr.slice();
    next.splice(idx, 1);
    return next;
}

function bumpNestedCount(
    nestedCountById: Record<string, number>,
    byId: Record<string, RNComment>,
    startParentId: string | null | undefined,
    delta: number
): Record<string, number> {
    if (!startParentId) return nestedCountById;
    const next: Record<string, number> = { ...nestedCountById };
    let parentId: string | null | undefined = startParentId;
    let guard = 0;
    while (parentId && guard < 10000) {
        guard++;
        const parent: RNComment | undefined = byId[parentId];
        if (!parent) break;
        const current = next[parentId] ?? 0;
        next[parentId] = Math.max(0, current + delta);
        parentId = parent.parentId;
    }
    return next;
}

export const createCommentsSlice: StateCreator<
    FastCommentsStoreState,
    [],
    [],
    CommentsSlice
> = (set, get) => ({
    byId: {},
    childrenByParent: {},
    rootOrder: [],
    pinnedIds: new Set<string>(),
    hiddenByParent: {},
    nestedCountById: {},
    commentsByUserId: {},

    page: 0,
    pagesLoaded: [0],
    hasMore: false,
    commentCountOnClient: 0,
    commentCountOnServer: 0,
    newRootCommentCount: 0,
    sortDirection: 'MR',
    commentsVisible: true,

    replaceAll: (comments, collapseRepliesByDefault) => {
        const byId: Record<string, RNComment> = {};
        const childrenByParent: Record<string, string[]> = {};
        const rootOrder: string[] = [];
        const pinnedIds = new Set<string>();
        const nestedCountById: Record<string, number> = {};
        const commentsByUserId: Record<string, Set<string>> = {};

        for (let i = 0; i < comments.length; i++) {
            byId[comments[i]._id] = comments[i];
        }

        for (let i = 0; i < comments.length; i++) {
            const comment = comments[i];
            const id = comment._id;
            const parentId = comment.parentId;

            if (
                collapseRepliesByDefault &&
                (!parentId || !byId[parentId]) &&
                comment.repliesHidden === undefined
            ) {
                byId[id] = { ...comment, repliesHidden: true };
            }

            addToUserIndex(commentsByUserId, comment.userId, id);

            if (parentId && byId[parentId]) {
                const list = childrenByParent[parentId];
                if (list) list.push(id);
                else childrenByParent[parentId] = [id];
            } else {
                rootOrder.push(id);
                if (comment.isPinned) pinnedIds.add(id);
            }

            // Climb ancestors to increment nested count — O(depth), but we only pay this once at replaceAll.
            let cursor = parentId;
            let guard = 0;
            while (cursor && guard < 10000) {
                guard++;
                const ancestor = byId[cursor];
                if (!ancestor) break;
                nestedCountById[cursor] = (nestedCountById[cursor] ?? 0) + 1;
                cursor = ancestor.parentId;
            }
        }

        set({
            byId,
            childrenByParent,
            rootOrder,
            pinnedIds,
            hiddenByParent: {},
            nestedCountById,
            commentsByUserId,
            commentCountOnClient: comments.length,
        });
    },

    upsertComment: (comment, newCommentsToBottom) => {
        const state = get();
        const id = comment._id;
        const parentId = comment.parentId;
        const existing = state.byId[id];

        // Skip if parent isn't known locally and it's not a root — matches old addCommentToTree behavior.
        if (parentId && !state.byId[parentId]) return;

        if (existing) {
            set({ byId: { ...state.byId, [id]: { ...existing, ...comment } } });
            return;
        }

        const byId = { ...state.byId, [id]: comment };
        let childrenByParent = state.childrenByParent;
        let rootOrder = state.rootOrder;
        let pinnedIds = state.pinnedIds;

        if (parentId) {
            childrenByParent = insertChild(childrenByParent, parentId, id, newCommentsToBottom);
        } else {
            if (comment.isPinned) {
                pinnedIds = new Set(pinnedIds);
                pinnedIds.add(id);
            }
            rootOrder = insertRoot(
                rootOrder,
                pinnedIds,
                byId,
                id,
                !!comment.isPinned,
                newCommentsToBottom
            );
        }

        const commentsByUserId = { ...state.commentsByUserId };
        addToUserIndex(commentsByUserId, comment.userId, id);

        const nestedCountById = bumpNestedCount(state.nestedCountById, byId, parentId, 1);

        set({
            byId,
            childrenByParent,
            rootOrder,
            pinnedIds,
            commentsByUserId,
            nestedCountById,
            commentCountOnClient: state.commentCountOnClient + 1,
        });
    },

    updateComment: (comment) => {
        const state = get();
        const existing = state.byId[comment._id];
        if (!existing) return;
        set({ byId: { ...state.byId, [comment._id]: { ...existing, ...comment } } });
    },

    mergeCommentFields: (id, patch) => {
        const state = get();
        const existing = state.byId[id];
        if (!existing) return;
        set({ byId: { ...state.byId, [id]: { ...existing, ...patch } } });
    },

    resetForNewContext: () => {
        set({
            byId: {},
            childrenByParent: {},
            rootOrder: [],
            pinnedIds: new Set<string>(),
            hiddenByParent: {},
            nestedCountById: {},
            commentsByUserId: {},
            page: 0,
            pagesLoaded: [],
            commentCountOnClient: 0,
            commentCountOnServer: 0,
            newRootCommentCount: 0,
        });
    },

    removeComment: (id) => {
        const state = get();
        const comment = state.byId[id];
        if (!comment) return;

        const byId = { ...state.byId };
        delete byId[id];

        let childrenByParent = state.childrenByParent;
        let rootOrder = state.rootOrder;
        let pinnedIds = state.pinnedIds;

        if (comment.parentId) {
            const updatedChildren = removeFromArray(childrenByParent[comment.parentId], id);
            if (updatedChildren !== childrenByParent[comment.parentId]) {
                childrenByParent = { ...childrenByParent };
                if (updatedChildren && updatedChildren.length > 0) {
                    childrenByParent[comment.parentId] = updatedChildren;
                } else {
                    delete childrenByParent[comment.parentId];
                }
            }
        } else {
            const updatedRoot = removeFromArray(rootOrder, id);
            if (updatedRoot !== rootOrder) rootOrder = updatedRoot!;
            if (pinnedIds.has(id)) {
                pinnedIds = new Set(pinnedIds);
                pinnedIds.delete(id);
            }
        }

        // Orphan descendants: remove their subtree entirely — matches the intent of
        // the prior code where removing a parent effectively orphaned children locally.
        const toDrop: string[] = [];
        const stack = [id];
        while (stack.length > 0) {
            const cursor = stack.pop()!;
            const children = childrenByParent[cursor];
            if (!children) continue;
            for (const childId of children) {
                toDrop.push(childId);
                stack.push(childId);
            }
        }
        if (toDrop.length > 0) {
            childrenByParent = { ...childrenByParent };
            for (const dropId of toDrop) {
                delete byId[dropId];
                delete childrenByParent[dropId];
            }
        }
        // Always drop the removed id's own child bucket.
        if (childrenByParent[id]) {
            childrenByParent = { ...childrenByParent };
            delete childrenByParent[id];
        }

        const commentsByUserId = { ...state.commentsByUserId };
        removeFromUserIndex(commentsByUserId, comment.userId, id);
        for (const dropId of toDrop) {
            const dropped = state.byId[dropId];
            if (dropped) removeFromUserIndex(commentsByUserId, dropped.userId, dropId);
        }

        const nestedCountById = bumpNestedCount(
            state.nestedCountById,
            byId,
            comment.parentId,
            -(1 + toDrop.length)
        );
        // Drop removed nodes from nestedCountById.
        const cleanedNestedCount = { ...nestedCountById };
        delete cleanedNestedCount[id];
        for (const dropId of toDrop) delete cleanedNestedCount[dropId];

        const hiddenByParent = { ...state.hiddenByParent };
        delete hiddenByParent[id];

        set({
            byId,
            childrenByParent,
            rootOrder,
            pinnedIds,
            commentsByUserId,
            nestedCountById: cleanedNestedCount,
            hiddenByParent,
            commentCountOnClient: Math.max(0, state.commentCountOnClient - 1 - toDrop.length),
        });
    },

    applyVote: (id, votes, votesUp, votesDown) => {
        const state = get();
        const existing = state.byId[id];
        if (!existing) return;
        set({
            byId: {
                ...state.byId,
                [id]: { ...existing, votes, votesUp, votesDown },
            },
        });
    },

    applyVoteDelta: (id, direction, isDeletion, isByCurrentUser) => {
        const state = get();
        const existing = state.byId[id];
        if (!existing) return;
        const sign = isDeletion ? -1 : 1;
        const votes = (existing.votes ?? 0) + sign * direction;
        const patch: Partial<RNComment> = { votes };
        if (direction > 0) {
            patch.votesUp = Math.max(0, (existing.votesUp ?? 0) + sign);
            if (isByCurrentUser) {
                patch.isVotedUp = isDeletion ? undefined : true;
            }
        } else {
            patch.votesDown = Math.max(0, (existing.votesDown ?? 0) + sign);
            if (isByCurrentUser) {
                patch.isVotedDown = isDeletion ? undefined : true;
            }
        }
        set({
            byId: { ...state.byId, [id]: { ...existing, ...patch } },
        });
    },

    applyBadge: (userId, badge, remove) => {
        const state = get();
        const commentIds = state.commentsByUserId[userId];
        if (!commentIds || commentIds.size === 0) return;

        const byId = { ...state.byId };
        let changed = false;
        for (const commentId of commentIds) {
            const existing = byId[commentId];
            if (!existing) continue;
            const existingBadges = existing.badges ?? [];
            if (remove) {
                const filtered = existingBadges.filter((b) => b.id !== badge.id);
                if (filtered.length === existingBadges.length) continue;
                byId[commentId] = { ...existing, badges: filtered };
                changed = true;
            } else {
                if (existingBadges.some((b) => b.id === badge.id)) continue;
                byId[commentId] = { ...existing, badges: [...existingBadges, badge] };
                changed = true;
            }
        }
        if (changed) set({ byId });
    },

    setRepliesHidden: (id, hidden) => {
        const state = get();
        const existing = state.byId[id];
        if (!existing) return;
        set({ byId: { ...state.byId, [id]: { ...existing, repliesHidden: hidden } } });
    },

    setReplyBoxOpen: (id, open) => {
        const state = get();
        const existing = state.byId[id];
        if (!existing) return;
        set({ byId: { ...state.byId, [id]: { ...existing, replyBoxOpen: open } } });
    },

    setHiddenChildrenCount: (parentId, count) => {
        const state = get();
        if ((state.hiddenByParent[parentId] ?? 0) === count) return;
        const next = { ...state.hiddenByParent, [parentId]: count };
        const byIdExisting = state.byId[parentId];
        if (byIdExisting) {
            set({
                hiddenByParent: next,
                byId: { ...state.byId, [parentId]: { ...byIdExisting, hiddenChildrenCount: count } },
            });
        } else {
            set({ hiddenByParent: next });
        }
    },

    incHiddenChildrenCount: (parentId, delta) => {
        const state = get();
        const current = state.hiddenByParent[parentId] ?? 0;
        const nextCount = Math.max(0, current + delta);
        const next = { ...state.hiddenByParent, [parentId]: nextCount };
        const byIdExisting = state.byId[parentId];
        if (byIdExisting) {
            set({
                hiddenByParent: next,
                byId: {
                    ...state.byId,
                    [parentId]: { ...byIdExisting, hiddenChildrenCount: nextCount },
                },
            });
        } else {
            set({ hiddenByParent: next });
        }
    },

    setNewRootCommentCount: (n) => set({ newRootCommentCount: n }),
    incNewRootCommentCount: (delta) =>
        set((state) => ({ newRootCommentCount: state.newRootCommentCount + delta })),
    incCommentCountOnServer: (delta) =>
        set((state) => ({
            commentCountOnServer: Math.max(0, state.commentCountOnServer + delta),
        })),
    setPage: (page) => set({ page }),
    addPageLoaded: (page) => {
        const loaded = get().pagesLoaded;
        if (loaded.includes(page)) return;
        set({ pagesLoaded: [...loaded, page] });
    },
    setHasMore: (hasMore) => set({ hasMore }),
    setSortDirection: (direction) => set({ sortDirection: direction }),
    setCommentsVisible: (visible) => set({ commentsVisible: visible }),
    setCommentCountOnClient: (count) => set({ commentCountOnClient: count }),
    setCommentCountOnServer: (count) => set({ commentCountOnServer: count }),

    repositionRoot: (id, before, after) => {
        const state = get();
        const existingIndex = state.rootOrder.indexOf(id);
        if (existingIndex === -1) return;
        const withoutId = state.rootOrder.slice();
        withoutId.splice(existingIndex, 1);
        let newIndex = -1;
        if (before !== undefined) {
            const beforeIdx = withoutId.indexOf(before);
            if (beforeIdx !== -1) newIndex = beforeIdx + 1;
        }
        if (newIndex === -1 && after !== undefined) {
            const afterIdx = withoutId.indexOf(after);
            if (afterIdx !== -1) newIndex = Math.max(afterIdx - 1, 0);
        }
        if (newIndex === -1) {
            withoutId.push(id);
        } else {
            withoutId.splice(newIndex, 0, id);
        }
        set({ rootOrder: withoutId });
    },

    ensureRepliesOpenTo: (commentId) => {
        const state = get();
        const byId = { ...state.byId };
        let parentId: string | null | undefined = commentId;
        let changed = false;
        let guard = 0;
        while (parentId && guard < 10000) {
            guard++;
            const parent: RNComment | undefined = byId[parentId];
            if (!parent) break;
            if (parent.repliesHidden !== false) {
                byId[parentId] = { ...parent, repliesHidden: false };
                changed = true;
            }
            parentId = parent.parentId;
        }
        if (changed) set({ byId });
    },
});

export { ROOT_PARENT_KEY };
