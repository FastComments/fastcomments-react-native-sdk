import { FastCommentsWidgetComment } from "fastcomments-typescript";

// RN library stores extra state on the comment object that other clients do not.
export interface RNComment extends FastCommentsWidgetComment {
    replyBoxOpen?: boolean;
    repliesHidden?: boolean;
    /** So we can change our comment in the current session w/o full authentication. **/
    editKey?: string;
    /** So we can change our vote in the current session w/o full authentication. **/
    voteEditKey?: string;
    wasPostedCurrentSession?: boolean;
    requiresVerification?: boolean;
    changeCounter?: number;
    depth?: number;
    /**
     * Server-driven lock flag. The fastcomments-typescript package shipped on
     * npm hasn't republished this field yet, but the API includes it on every
     * GetCommentsResponse comment - so we declare it here.
     */
    isLocked?: boolean | null;
    /**
     * Server-driven hidden flag used by live-event paths (a new comment that
     * arrives via WebSocket starts hidden until the user taps "Show".)
     */
    hidden?: boolean;
    /** Live-only count of children that have arrived but are still hidden. */
    hiddenChildrenCount?: number;
}
