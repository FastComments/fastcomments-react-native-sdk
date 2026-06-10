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
    /** Render the submit button as an icon inside the comment box (replaces the standalone labeled button). **/
    useInlineSubmitButton?: boolean
}
