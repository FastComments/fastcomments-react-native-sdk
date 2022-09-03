import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";

/** React-Native specific config has more configuration than other libraries. **/
export interface FastCommentsRNConfig extends FastCommentsCommentWidgetConfig {
    /** Press-and-hold comments to open menu. **/
    usePressToEdit?: boolean
    /** Scroll comments. **/
    scrollComments?: boolean
    /** Disable down votes. **/
    disableDownVoting?: boolean
    /** Render commenter info (avatar, name) inside same HTML renderer as comment content. This can be desirable when displaying content inline with the username. **/
    renderCommentInline?: boolean
    /** Puts the like/voting area to the right side of the screen, instead of below comments. **/
    renderLikesToRight?: boolean
}
