# fastcomments-react-native-sdk

This library is a complete webview-free react-native implementation of [FastComments](https://fastcomments.com).

It supports live commenting, chat, threads, emoticons, notifications, SSO, skins, and full customization by passing in a stylesheet object. All assets
can also be customized, and it supports toggling different assets based on dark mode. It only has three direct dependencies (`react`, `hookstate`, and a library to render HTML).

It all runs on the FastComments backend, so you only have to incorporate the UI:

```tsx
    <FastCommentsLiveCommenting config={config} styles={styles} callbacks={callbacks} assets={assets}/>
```

See [example/src](./example/src) for more examples.

Add live chat to your existing React Native application, or even build a social network!

### No WebViews!

This library incorporates its own WYSIWYG editor written in native React, so that we do not depend on loading a WebView to type text.

### Configuration Options

This library aims to support all configuration options defined in [fastcomments-typescript](https://github.com/FastComments/fastcomments-typescript/blob/main/src/fast-comments-comment-widget-config.ts), just like the web implementation.

### FastComments Concepts

The main concepts to be aware of to get started are `tenantId` and `urlId`. `tenantId` is your FastComments.com account identifier. `urlId` is where comment threads
will be tied to. This could be a page URL, or a product id, an article id, etc.

### User Notifications

FastComments supports notifications for [many scenarios](https://docs.fastcomments.com/guide-notifications.html). Notifications are configurable,
can be opted-out globally or at a notification/comment level, and supports page-level subscriptions so that users can subscribe to threads of a
specific page or article.

For example, it is possible to use Secure SSO to authenticate the user and then periodically poll for unread notifications and push them to the user.

See [the example AppNotificationSecureSSO](./example/src/AppNotificationsSecureSSO.tsx) for how to get and translate unread user notifications.

### Gif Browser

By default, no image or gif selection is enabled. See [example/src/AppCommentingImageSelection.tsx](./example/src/AppCommentingImageSelection.tsx) for how
to support image and gif uploads. There is a Gif Browser that anonymizes searches and images provided in this library, you simply have to use it.

### Performance

Please open a ticket with an example to reproduce, including device used, if you identify any performance problems. Performance is a first-class citizen
of all FastComments libraries.

### Contributing

Contributions are welcome. Please open a GitHub issue first and tag `@winrid` to confirm it is not something we are already working on (or not able to accept).
Keep in mind that most features should be opt-in by default to maximize flexibility and performance.

### Feature/Development Checklist - v1

- [x] WYSIWYG editing existing text
- [x] WYSIWYG functional for basic use cases.
- [x] Secure & Simple SSO Examples
- [x] WYSIWYG editor (supports images etc)
- [x] Reply Area Toolbar (similar to vanillajs widget)
- [x] Child Comments & Replies
- [x] Read Native SDK able to login when posting comment
- [x] Can Log Out
- [x] Can post a comment + show errors.
- [x] Flagging
- [x] Blocking
- [x] Pinning Comments
- [x] Render new live comments
- [x] Switch to useHookState
- [x] Deleting comments
- [x] Editing comments
- [x] All comment menu styling.
- [x] Fetching and Rendering Comments
- [x] WYSIWYG Performance Update #1 - Recalculate content on demand vs on change event.
- [x] BUG: New comments should go to top of or bottom of list based on configuration.
- [x] Emoticon Support
- [x] Voting
- [x] Ability to hide replies
- [x] Show/Hide Comments Toggle
- [x] Pagination (Buttons)
- [x] Pagination (Infinite Scroll)
- [x] Custom Styles (as typed stylesheet)
- [x] Callbacks (similar to vanillajs widget)
- [x] Dark mode skin
- [x] Social-media like skin
- [x] Improved Comment Styling
- [x] Notifications List (shows when clicking bell). Supports subscriptions.
- [x] Chat Reactions
- [x] Support for showLiveRightAway = false
- [x] User activity indicators
- [x] Native WYSIWYG Multiline Support
- [x] Media Selection & Uploads
- [x] Gif Browser - With default trending + search capability. Images and searching anonymized by proxy.
- [x] Release to NPM
- [x] Switch Pressable usage to Button or TouchableOpacity where possible
- [x] WYSIWYG Editor Optimizations (ideally 60fps while typing)
- [x] Notification Service (get user's unread notifications in the background to push to them, etc)
- [ ] Better WYSIWYG bar icons (web ones don't look good in native)
- [ ] Complete all TODOs
- [x] Profile & ensure 40 FPS minimum during writing comments, submitting, voting, and opening reply menu.
- [x] Add @username to text box when replying and using useSingleReplyField = true
