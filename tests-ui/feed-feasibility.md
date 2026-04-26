# Feed for the React Native SDK - Feasibility

> **Update 2026-04-26: MVP shipped.** A minimum-viable Feed surface is now
> live and the dual-instance `tests-ui/specs/feed.test.tsx` passes against the
> real backend. The body of this document below remains as the original
> feasibility scoping note; treat it as the source-of-truth surface inventory
> when the parity epic kicks off.
>
> Shipped in the MVP:
> - `<FastCommentsFeed>` host component (`src/components/feed.tsx`).
> - `<FeedPostRow>`, `<FeedPostComposer>`, `<FeedNewPostsBanner>` subcomponents.
> - `src/services/feed.ts` (loadFeedPosts / createFeedPost / deleteFeedPost,
>   wire-format `_id` -> `id` normalization, `afterId` cursor).
> - `src/services/feed-live.ts` lifecycle helper. Live events are routed via
>   the existing `live.ts` switch so the per-store `broadcastIdsSent` filter
>   keeps two instances from suppressing each other's events.
> - `FeedSlice` in `src/store/slices/feed.ts` (feedPostsById, feedPostOrder,
>   feedHasMore, feedNewPostsCount, feedAfterId, feedLoadFailed, plus
>   mutators).
> - testIDs: `recyclerViewFeed`, `emptyStateView`, `newPostsBanner`,
>   `postContentEditText`, `postTitleEditText`, `submitPostButton`, per-row
>   `feedPostRow-{postId}`.
> - Translation keys (in `fastcomments-localization/text/widgets/comment-ui/en_us.json`):
>   FEED_EMPTY, FEED_NEW_POST_BANNER, FEED_NEW_POST_BANNER_PLURAL,
>   FEED_COMPOSER_TITLE_PLACEHOLDER, FEED_COMPOSER_CONTENT_PLACEHOLDER,
>   FEED_SUBMIT_POST, FEED_LOAD_FAILED. Pulled from the comment-ui namespace
>   (`/translations/widgets/comment-ui`) on mount.
>
> Deferred for the parity epic (sub-features still missing relative to the
> Android Feed SDK): media uploads, reactions, follow, custom toolbar
> buttons, polling stats refresh (30 s), scroll-position restoration on
> remount. The original effort note below was correct that those add up to
> several weeks.

---

Status: **deferred**. Recommended scope: 2-3 weeks of focused work, not a single PR.

## Summary

The Android SDK ships a fully-featured Feed product (5,325 lines of Java across
6 files). The React Native SDK does not export any Feed surface today (`index.ts`
re-exports comments-only modules). The two `FeedUserA_UITests` /
`FeedUserB_UITests` instrumentation tests are short (137 lines each) but exercise
the entire feed stack end-to-end: launch a feed activity, accept either a
populated list or an empty state, watch a "new posts" banner appear via
WebSocket when the peer posts, tap the banner, observe the new post in the list,
then post via the composer and confirm the peer sees it. Faithfully porting them
requires building the supporting components and services, not just a thin
wrapper.

## Android Feed surface (what would need a counterpart)

Files under `fastcomments-android/libraries/sdk/src/main/java/com/fastcomments/sdk/`:

- `FastCommentsFeedSDK.java` (1564 lines) - state, pagination, WebSocket
  subscription, reactions, follow state, polling stats, tag filtering, media
  upload helpers, save/restore pagination state.
- `FastCommentsFeedView.java` (1118 lines) - `RecyclerView` host, swipe-to-refresh,
  empty/error/loading states, "Show N new posts" banner, scroll position
  retention, periodic stats polling (30 s).
- `FeedPostsAdapter.java` (1618 lines) - row binder for each post: media gallery,
  reactions, comment-count button, follow pill, custom toolbar buttons, edit /
  delete menu, link previews.
- `FeedPostCreateView.java` (908 lines) - rich post composer with multi-asset
  media upload pipeline.
- `FeedPostType.java` (25 lines) - enum.
- `FeedCustomToolbarButton.java` (92 lines) - extension hook for host apps.

Test entry points used by the tests we want to port:
`recyclerViewFeed`, `emptyStateView`, `newPostsBanner`, `postContentEditText`,
`submitPostButton`, plus the activity launcher `launchFeedActivity(urlId, sso)`.

WebSocket events the SDK consumes (from `LiveEventType`):
`new-feed-post`, `updated-feed-post`, `deleted-feed-post`. Subscribed via the
same `subscribeToChanges(config, tenantIdWS, urlIdWS, userIdWS, ...)` channel
the comments path uses; the banner mechanic is purely client side - it counts
incoming `new-feed-post` events without inserting them into the list, then on
banner tap reloads the head of the feed.

## Backend / SDK npm client coverage

The typed client at `node_modules/fastcomments-sdk` already covers everything we
would need. From `dist/generated/api/public-api.d.ts`:

- `getFeedPostsPublic(tenantId, afterId?, limit?, tags?, sso?, ...)`
- `createFeedPostPublic(tenantId, params, broadcastId?, sso?)`
- `updateFeedPostPublic(tenantId, postId, params, broadcastId?, sso?)`
- `deleteFeedPostPublic(tenantId, postId, broadcastId?, sso?)`
- `reactFeedPostPublic(tenantId, postId, body, isUndo?, broadcastId?, sso?)`
- `getFeedPostsStats(tenantId, postIds, sso?)`

Live events: `subscribeToChanges` already exported from `fastcomments-sdk/live`
and used by the RN comments path; the same call carries feed events. No new
transport work is required.

Backend route file: `fastcomments/routes/public-api/v1/feed-posts.ts` (and the
authenticated controller at `fastcomments/routes/controllers/feed-post-controller.ts`).
Production-shape, no new endpoints needed.

## What porting to RN actually entails

Components (new):
1. `FastCommentsFeed` host component (analog of `FastCommentsFeedView`) - manages
   the SDK lifecycle, owns the FlatList, renders empty / error / banner /
   composer. Even a stripped version with no media gallery / reactions / follow
   pill is ~400-500 lines of TSX.
2. `FeedPostRow` - one post card. Plain title + content version is small (~80
   lines), but to match Android we would also wire reactions + comment-count
   click-through (another ~200 lines).
3. `FeedPostComposer` - title + content textarea + submit. Without media uploads,
   ~120 lines.
4. `FeedNewPostsBanner` - tappable strip showing `Show N new posts`. ~30 lines.

Services (new):
5. `src/services/feed.ts` - thin wrapper around `PublicApi.getFeedPostsPublic` /
   `createFeedPostPublic` / `deleteFeedPostPublic` / `reactFeedPostPublic`,
   plus pagination cursor handling. ~200 lines.
6. `src/services/feed-live.ts` - subscribe to `subscribeToChanges`, route
   `new-feed-post` / `updated-feed-post` / `deleted-feed-post` to the store.
   ~120 lines.

Store / state (new):
7. A feed slice modelled on the comments slice: posts list, postsById,
   pagination cursor (`lastPostId`), `hasMore`, `newPostsCount`,
   `broadcastIdsSent` (per-store, see existing comments fix), `myReacts`. New
   selectors. ~250 lines.

Types:
8. Re-export `FeedPost`, `CreateFeedPostParams`, `UpdateFeedPostParams`,
   `FeedPostMediaItem`, `LiveEventType` (already typed in the npm client; no new
   type definitions needed, just public re-exports from `src/types/`).

Localization:
9. `fastcomments-localization` keys for empty state, banner copy, composer
   placeholder + submit button, error messages. ~6-8 keys.

Tests (new):
10. `tests-ui/specs/feed.test.tsx` - dual-instance scenario mirroring the two
    Android files. Roughly 250 lines including setup/teardown, leveraging the
    existing `TestSyncCoordinator` from `tests-ui/framework/harness/sync.ts`.
    Needs a launcher equivalent to `launchFeedActivity` (just a `render(<FastCommentsFeed ... />)`
    call once the component exists).
11. testIDs threaded through the new components: `recyclerViewFeed`,
    `emptyStateView`, `newPostsBanner`, `postContentEditText`, `submitPostButton`,
    plus per-row testIDs for follow-up tests.

Estimated effort:
- Minimum-viable port (no media uploads, no reactions, no follow, no rich
  composer; just title + content + list + websocket banner): roughly 1,000 -
  1,200 lines of new TS / TSX, plus the test. About 1 - 1.5 weeks of focused
  work, including red/green cycle for the two Android scenarios.
- Feature parity with Android (media gallery, reactions, follow, custom toolbar
  buttons, polling stats, scroll restoration): 2 - 3 weeks. Worth tracking as a
  separate epic.

## Why this is not a single-PR effort

Even the minimum-viable cut requires new components, a new service module, a
new store slice, six-plus localization keys, a websocket integration path, and a
two-instance test. The Android `FeedUserA` / `FeedUserB` pair only looks small
because they call into a feature-complete SDK that already does the heavy
lifting. Building that lifting in RN is the actual work.

A 1 - 2 hour scope risks leaving stub code that passes the two banner
assertions but ships without empty-state UX, error handling, pagination, or
proper cleanup on unmount - exactly the half-finished shape this task brief
calls out as unacceptable.

## Recommendation

- Defer Feed in the RN SDK. Track it as a standalone epic with the scope
  outlined above.
- Keep the Feed entry in `planning/UI_TESTS_RN.txt` as `[-]` (skipped, RN feature
  gap) and link to this document.
- When the epic kicks off, start with the minimum-viable cut and run the
  `FeedUserA_UITests` + `FeedUserB_UITests` pair red-green against the new
  component to keep the port scoped.

## File pointers

- Android SDK: `/home/winrid/dev/fastcomments/fastcomments-android/libraries/sdk/src/main/java/com/fastcomments/sdk/FastCommentsFeedSDK.java`
- Android view: `/home/winrid/dev/fastcomments/fastcomments-android/libraries/sdk/src/main/java/com/fastcomments/sdk/FastCommentsFeedView.java`
- Android adapter: `/home/winrid/dev/fastcomments/fastcomments-android/libraries/sdk/src/main/java/com/fastcomments/sdk/FeedPostsAdapter.java`
- Android composer: `/home/winrid/dev/fastcomments/fastcomments-android/libraries/sdk/src/main/java/com/fastcomments/sdk/FeedPostCreateView.java`
- Android tests: `/home/winrid/dev/fastcomments/fastcomments-android/app/src/androidTest/java/com/fastcomments/FeedUserA_UITests.java`, `FeedUserB_UITests.java`
- Backend route: `/home/winrid/dev/fastcomments/fastcomments/routes/public-api/v1/feed-posts.ts`
- Backend controller: `/home/winrid/dev/fastcomments/fastcomments/routes/controllers/feed-post-controller.ts`
- npm client public api: `/home/winrid/dev/fastcomments/fastcomments-react-native-sdk/node_modules/fastcomments-sdk/dist/generated/api/public-api.d.ts`
- npm client live events: `/home/winrid/dev/fastcomments/fastcomments-react-native-sdk/node_modules/fastcomments-sdk/dist/live/subscribe-to-changes.d.ts`
- npm client `FeedPost` model: `/home/winrid/dev/fastcomments/fastcomments-react-native-sdk/node_modules/fastcomments-sdk/dist/generated/model/feed-post.d.ts`
