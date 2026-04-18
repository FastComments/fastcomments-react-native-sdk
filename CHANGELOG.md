# Changelog

## 4.0.0

State management rewrite. Internal implementation changed from Hookstate to Zustand, with a flat indexed comment store (byId + childrenByParent + rootOrder + pinnedIds) replacing the previous tree-in-state. Delivers O(1) live-event mutations, removes two full-tree JSON deep-clones on every fetch, and drops the global CommentChangeCounter memoization hack in favor of standard selector-based subscriptions.

### Breaking changes

- `FastCommentsCallbacks.onCommentsRendered` signature changed:
  - Before: `(comment: ImmutableArray<RNComment>) => void`
  - After: `(comments: readonly RNComment[]) => void`
  - Migration: drop any Hookstate-specific access; treat the argument as a plain readonly array.
- `@hookstate/core` is no longer a dependency. If you were reaching into this SDK's internals and importing Hookstate helpers from it, migrate to plain data access.
- The `FastCommentsState` shape exported from `./types` is now a backwards-compatible facade only. Internal state lives in the Zustand store returned by `FastCommentsLiveCommentingService.createStoreFromConfig(...)`. Consumers that only used the public component API (`<FastCommentsLiveCommenting .../>`) are not affected.

### Performance

At 1000 comments (measured locally, synthetic fixtures):

- 100 sequential vote events: 18 ms (was O(n) per event under Hookstate due to tree rebuilds)
- 100 sequential new-reply insertions: 49 ms
- New-comment insertion: O(1) amortized + O(depth) nested count update (was O(n) + full tree rebuild)
- Badge add/remove: O(k) where k = that user's comment count (was O(n) full scan)
- Comment deletion: O(1) + O(subtree) cleanup (was O(n) findIndex twice)
- Visible flat list: derived selector with referential-identity memoization (was full O(n) rebuild on every mutation)

### Internal changes

- New `src/store/` module: `create-store.ts`, slices (`comments`, `config`, `presence`, `notifications`), selectors (`visible-list`, `comment-by-id`), and hook helpers.
- Per-comment relative-date timers consolidated into a single shared ticker (`src/services/relative-time-ticker.ts`).
- `src/services/comment-render-determination.ts` deleted; memoization is now handled by narrow selectors.
- `src/services/comment-trees.ts` slimmed to a normalizer + iteration helpers.
