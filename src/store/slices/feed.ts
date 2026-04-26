import type { StateCreator } from 'zustand';
import type { FeedPost } from '../../types/feed-post';
import type { FeedSlice, FastCommentsStoreState } from '../types';

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

    incFeedNewPostsCount: (delta) =>
        set((s) => ({ feedNewPostsCount: Math.max(0, s.feedNewPostsCount + delta) })),
    clearFeedNewPostsCount: () => set({ feedNewPostsCount: 0 }),
    setFeedHasMore: (hasMore) => set({ feedHasMore: hasMore }),
    setFeedAfterId: (id) => set({ feedAfterId: id }),
    setFeedLoadFailed: (failed) => set({ feedLoadFailed: failed }),

    resetFeedForNewContext: () =>
        set({
            feedPostsById: {},
            feedPostOrder: [],
            feedHasMore: false,
            feedNewPostsCount: 0,
            feedAfterId: undefined,
            feedLoadFailed: false,
        }),
});
