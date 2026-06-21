import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";

/** React-Native specific config has more configuration than other libraries. **/
export interface FastCommentsRNConfig extends FastCommentsCommentWidgetConfig {
    /** Press-and-hold comments to open menu. **/
    usePressToEdit?: boolean
    /** Disable down votes. **/
    disableDownVoting?: boolean
    /** Render commenter info (avatar, name) inside same HTML renderer as comment content. This can be desirable when displaying content inline with the username. **/
    renderCommentInline?: boolean
    /** Puts the like/voting area to the right side of the screen, instead of below comments. **/
    renderLikesToRight?: boolean
    /** Puts the like/voting area to below each comment. **/
    renderDateBelowComment?: boolean
    /** Show the chat-style "Live" + user-count header strip above comments. **/
    showLiveStatus?: boolean
    /** When true (default), the FastCommentsFeed remembers its FlatList scroll offset across unmount/remount, keyed by tenantId + urlId. **/
    preserveFeedScrollPosition?: boolean
    /** Hide the post composer built into FastCommentsFeed (e.g. when placing a standalone FeedPostComposer elsewhere). **/
    hideFeedComposer?: boolean
    /** Render the submit button as an icon inside the comment box (replaces the standalone labeled button). **/
    useInlineSubmitButton?: boolean
    /** With useShowCommentsToggle: how many comments render above the Show Comments toggle while collapsed (mirrors the web widget's countAboveToggle). **/
    countAboveToggle?: number
    /** Hide the top bar above the comment input (logged-in username, avatar, logout menu, and notification bell). **/
    hideTopBar?: boolean
}
