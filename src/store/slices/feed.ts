import type { StateCreator } from 'zustand';
import type { FeedPost } from '../../types/feed-post';
import type { FeedSlice, FastCommentsStoreState, FeedPostStatsPatch } from '../types';

export const createFeedSlice: StateCreator<FastCommentsStoreState, [], [], FeedSlice> = (
    set,
    get
) => ({
    feedPostsById: {},
    feedPostOrder: [],
    feedHasMore: false,
    feedNewPostsCount: 0,
    feedAfterId: undefined,
    feedLoadFailed: false,
    followingUserIds: new Set<string>(),
    followPendingUserIds: new Set<string>(),

    replaceFeedPosts: (posts) => {
        const feedPostsById: Record<string, FeedPost> = {};
        const feedPostOrder: string[] = [];
        for (const post of posts) {
            feedPostsById[post.id] = post;
            feedPostOrder.push(post.id);
        }
        const last = posts[posts.length - 1];
        set({
            feedPostsById,
            feedPostOrder,
            feedAfterId: last ? last.id : undefined,
            feedNewPostsCount: 0,
            feedLoadFailed: false,
        });
    },

    appendFeedPosts: (posts) => {
        const state = get();
        const feedPostsById = { ...state.feedPostsById };
        const seen = new Set(state.feedPostOrder);
        const additions: string[] = [];
        for (const post of posts) {
            if (!seen.has(post.id)) {
                additions.push(post.id);
                seen.add(post.id);
            }
            feedPostsById[post.id] = post;
        }
        const feedPostOrder = additions.length
            ? state.feedPostOrder.concat(additions)
            : state.feedPostOrder;
        const last = posts[posts.length - 1];
        set({
            feedPostsById,
            feedPostOrder,
            feedAfterId: last ? last.id : state.feedAfterId,
            feedLoadFailed: false,
        });
    },

    prependFeedPost: (post) => {
        const state = get();
        if (state.feedPostsById[post.id]) {
            // Already present: just merge the latest fields.
            set({
                feedPostsById: { ...state.feedPostsById, [post.id]: { ...state.feedPostsById[post.id], ...post } },
            });
            return;
        }
        set({
            feedPostsById: { ...state.feedPostsById, [post.id]: post },
            feedPostOrder: [post.id, ...state.feedPostOrder],
        });
    },

    updateFeedPost: (post) => {
        const state = get();
        const existing = state.feedPostsById[post.id];
        if (!existing) return;
        set({
            feedPostsById: { ...state.feedPostsById, [post.id]: { ...existing, ...post } },
        });
    },

    removeFeedPost: (id) => {
        const state = get();
        if (!state.feedPostsById[id]) return;
        const feedPostsById = { ...state.feedPostsById };
        delete feedPostsById[id];
        const feedPostOrder = state.feedPostOrder.filter((x) => x !== id);
        set({ feedPostsById, feedPostOrder });
    },

    mergeFeedPostStats: (statsById: Record<string, FeedPostStatsPatch>) => {
        const state = get();
        let mutated = false;
        const next: Record<string, FeedPost> = state.feedPostsById;
        const draft: Record<string, FeedPost> = { ...next };
        for (const id in statsById) {
            const existing = next[id];
            if (!existing) continue;
            const patch = statsById[id];
            // Skip if the patch is empty.
            if (patch.commentCount === undefined && !patch.reacts) continue;
            const merged: FeedPost = { ...existing };
            if (patch.commentCount !== undefined) merged.commentCount = patch.commentCount;
            if (patch.reacts) merged.reacts = patch.reacts;
            draft[id] = merged;
            mutated = true;
        }
        if (mutated) set({ feedPostsById: draft });
    },

    incFeedNewPostsCount: (delta) =>
        set((s) => ({ feedNewPostsCount: Math.max(0, s.feedNewPostsCount + delta) })),
    clearFeedNewPostsCount: () => set({ feedNewPostsCount: 0 }),
    setFeedHasMore: (hasMore) => set({ feedHasMore: hasMore }),
    setFeedAfterId: (id) => set({ feedAfterId: id }),
    setFeedLoadFailed: (failed) => set({ feedLoadFailed: failed }),
    setFeedStatsTimerId: (id) => set({ feedStatsTimerId: id }),

    applyFeedPostReactDelta: (postId, reactType, delta, myReactsValue) => {
        const state = get();
        const existing = state.feedPostsById[postId];
        if (!existing) return;
        const reacts: Record<string, number> = { ...(existing.reacts ?? {}) };
        const next = (reacts[reactType] ?? 0) + delta;
        if (next > 0) {
            reacts[reactType] = next;
        } else {
            delete reacts[reactType];
        }
        let myReacts: Record<string, boolean> | undefined = existing.myReacts;
        if (myReactsValue !== undefined) {
            const updated: Record<string, boolean> = { ...(existing.myReacts ?? {}) };
            if (myReactsValue) {
                updated[reactType] = true;
            } else {
                delete updated[reactType];
            }
            myReacts = updated;
        }
        set({
            feedPostsById: {
                ...state.feedPostsById,
                [postId]: { ...existing, reacts, myReacts },
            },
        });
    },

    setFeedPostReacts: (postId, reacts, myReacts) => {
        const state = get();
        const existing = state.feedPostsById[postId];
        if (!existing) return;
        set({
            feedPostsById: {
                ...state.feedPostsById,
                [postId]: { ...existing, reacts, myReacts },
            },
        });
    },

    resetFeedForNewContext: () =>
        set({
            feedPostsById: {},
            feedPostOrder: [],
            feedHasMore: false,
            feedNewPostsCount: 0,
            feedAfterId: undefined,
            feedLoadFailed: false,
            followingUserIds: new Set<string>(),
            followPendingUserIds: new Set<string>(),
        }),

    setFollowingUser: (userId, following) => {
        const state = get();
        const next = new Set(state.followingUserIds);
        if (following) next.add(userId);
        else next.delete(userId);
        set({ followingUserIds: next });
    },

    setFollowPending: (userId, pending) => {
        const state = get();
        const next = new Set(state.followPendingUserIds);
        if (pending) next.add(userId);
        else next.delete(userId);
        set({ followPendingUserIds: next });
    },
});
