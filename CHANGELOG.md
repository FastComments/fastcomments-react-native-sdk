# Changelog

## 5.0.0

Major release: a complete visual redesign on a semantic theme-token layer, the `FastCommentsLiveChat` widget, first-class web support via `react-native-web`, and an upgrade of the dev/test/example toolchain to React Native 0.81 / React 19. The SDK source only uses stable RN APIs, so a consumer's integration code is unaffected; the break is the supported RN/React floor.

### Breaking

- Requires React Native 0.81 / React 19 on the toolchain. The Fabric editor (`react-native-enriched`) needs the New Architecture, the default since RN 0.76; consumers on older RN cannot take this as a minor.
- Migrates to `fastcomments-sdk` 3.3.1: GIF methods renamed (`search`/`getTrending`/`getLarge` -> `getGifsSearch`/`getGifsTrending`/`getGifLarge`), `logout` -> `logoutPublic`, page reacts -> `getV2PageReacts`/`createV2PageReact`/`deleteV2PageReact`/`getV2PageReactUsers`, `getUserNotifications` gains `urlId`, `getCommentsForUser` reshaped (dropped tenantId/urlId/sso/cursor params), `reactFeedPostPublic` dropped `urlId`. Enum value imports moved to `fastcomments-sdk/server` (the bare entry is type-only).

### New

- `config.hideTopBar` (`FastCommentsRNConfig`): hide the logged-in user + notification-bell strip above the composer.
- First-class web overlays: the comment/sort menus, GIF popover, and notification list are portaled to the body and anchored under their trigger via shared `useAnchoredPosition` / `useDismissOnOutsideClick` hooks (capture-phase outside-click that excludes the trigger and content; selection closes the menu explicitly). The notification list opens as an anchored popover under the bell instead of a full-screen modal.
- `shadow*` styles emit CSS `boxShadow` on web (react-native-web deprecates `shadow*`); native keeps `shadow*` + `elevation`.

- `FastCommentsTheme` semantic token layer (colors, spacing, radii, font sizes, font weights, avatar sizes). New optional `theme` prop on `FastCommentsLiveCommenting`, `FastCommentsFeed`, and `FastCommentsLiveChat` generates the entire default style tree from tokens; `getLightTheme()` / `getDarkTheme()` / `resolveTheme()` exported. `styles` passed together with `theme` is merged on top (styles win); `styles` alone keeps the legacy full-replace behavior.
- `FastCommentsLiveChat` widget (Android `LiveChatView` parity): chronological messages, composer below the list, live header strip with connection dot + user count, auto-scroll to new messages (pauses while scrolled up, resumes at the bottom or on your own message), older history loads on scroll-to-top, votes and reply threading disabled. All presets overridable via `config`.
- `config.maxReplyDepth: 0` now hides reply buttons (flat mode).
- Page reacts (`config.pageReactConfig`): the web widget's page-level react bar, rendered above the composer with per-react counts, selected/unselected images, persistence, and the `showUsers` reacted-by list. Backed by new typed page-reacts endpoints in fastcomments-sdk.
- `config.voteStyle: VoteStyle.Heart`: single like toggle per comment instead of up/down, using the new `ICON_HEART`/`ICON_HEART_ACTIVE` assets (overridable via the `assets` prop, e.g. with a star).
- `config.useInlineSubmitButton`: renders the submit button as an icon inside the comment box instead of the standalone labeled button.
- `config.mentionGroupIds` is now forwarded to mention user search.
- `config.countAboveToggle` (web widget parity): with `useShowCommentsToggle`, the widget starts collapsed like the web widget and renders the first N root comments as a teaser above the Show Comments toggle; the toggle reveals the rest. Toggled widgets previously started expanded and the collapsed state dropped the composer entirely.
- Image-upload and GIF toolbar buttons now render by default like the web widget. The GIF button opens the SDK's built-in GifBrowser (in a Modal, so it overlays the list on web too) and the selection inserts into the comment; hosts can still take over via the `pickGIF` callback. The image button uses a DOM file-input fallback on web; on native it appears once the host supplies `pickImage` (the SDK ships no native file picker). GifBrowser layout cleaned up (contained images, scrim, sized modal).
- Redesigned default look ("modern neutral"): token-driven palette with hairline separators, pill vote buttons and chips, filled primary action buttons, larger rounded avatars without drop shadows, a consistent 14px+ type scale, and themed dark mode. The dark and erebus skins now derive from the dark theme; `setupDarkModeSkin` is deprecated in favor of the `theme` prop.
- New style keys: `commentTextArea.toolbarRoot/toolbarFormatButton/toolbarFormatButtonActive/toolbarFormatButtonText`, `mentionPopup.itemSelected`, `comment.textLinkStyles` (per-tag HTML styles, used for link color), `liveChat.root/composerWrapper`.

### Fixed

- Feed posts composed in the SDK rendered with literal `<p>` tags: the composer wrapped content in `<p>`, which the server entity-escapes (not an allowed tag). The composer now sends `<br>`-separated content like the web feed widget.
- Multi-paragraph comments lost their line breaks: the editor emits `<p>`-wrapped paragraphs, which the server strips, gluing paragraphs together. Editor HTML is now normalized to `<br>`-separated content before create and edit.
- Guest voting was a silent dead end: a stale anon session was treated as authenticated, the 401 was swallowed, and nothing happened on tap. Ghost anon sessions now route to the vote identity form, request failures render a visible error, and the vote auth inputs are themed.
- A ghost anon session (stale cookie, no username) lit up logged-in chrome: an empty username box in the top bar, a Log Out menu, and a notification bell whose requests 401'd into an infinite spinner. The top bar now requires an identified user, and the notification list handles load failures with a visible error instead of spinning forever.
- Reply indentation was always zero (the depth attached by the list was lost in a store merge), making threads render flat. Replies indent again, and the default indent is larger.
- Dark theme: typed editor text was black-on-black, and light-theme PNG icons (bell, vote arrows, menu icons) were used on dark backgrounds. The editor now receives themed text color, font size, and placeholder; `hasDarkBackground` is derived from the theme's background luminance so dark icon variants apply automatically.
- The composer had no placeholder and stole focus on page load (web).
- `Alert.alert` is a no-op under react-native-web, so canceling a reply, confirming a delete/block, and error display were all dead ends in browsers. Dialogs now route through a platform shim (window.confirm/alert on web).
- Bold/italic/underline formatting in posted comments rendered as plain text on web; explicit per-tag styles restore inline formatting.
- The chat widget opened scrolled to the oldest message on web; it now pins to the newest message once content lays out. The comment-count/sort header is suppressed in chat mode.
- Comments beyond the tenant character limit were silently truncated client-side; the SDK now shows the COMMENT_TOO_BIG error instead of losing the tail.
- "Subscribe to this page" never persisted: `getUserNotifications` now sends `urlId`, so the server returns the correct per-page `isSubscribed` and the checkbox no longer resets each time the list reopens.
- `onScroll` top-pagination (chat mode) could fire `doPaginateNext` more than once between renders; a ref guard closes the double-fire window.

### UX polish

- Username now renders above the "Unverified comment" label (identity first, status second).
- The guest name/email form is progressively disclosed on composer focus instead of rendering permanently.
- Touch targets raised toward the 44px guideline (vote pills, reply, sort, bell, three-dot menu); vote icons enlarged; vote counts show 0 instead of hiding; the modal menus gained a scrim; composer and list share one gutter; the notification bell hides its badge at zero and the BackHandler warning is gone on web.

### Testing

- New web test lane (`npm run test-web`): vitest + jsdom in `example-web/`, mounting the SDK through react-native-web with the real `react-native-enriched` (tiptap) editor against the real backend; covers the `.web.tsx` / react-native-web class of regression the node suite cannot reach.
- The jest mock for `react-native-enriched` now mirrors the real editor's HTML contract (`<p>`-wrapped paragraphs). New E2E specs: LiveChat widget (dual-session two-way exchange, header strip, presets, auto-scroll, load-older), the theme prop, guest submit, multi-paragraph comments. New web-lane specs: anchored `ModalMenu` (select/dismiss/sub-modal) and the notification popover (anchor + outside-click dismiss).
- Verified on the RN 0.81 / React 19 stack: `tsc --noEmit` clean, 137 unit tests, 12 web-lane tests, and the tests-ui harness renders under React 19 (`render-smoke`). The full live E2E suite requires a backend key and the native example app (still RN 0.69) was not rebuilt.

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
