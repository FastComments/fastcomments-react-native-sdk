import { FastCommentsWidgetComment } from "fastcomments-typescript";

/**
 * Nesting-rail slot kinds, one per indent level (left to right). 'line' = an
 * ancestor branch continues below this row; 'elbow' = this row is its parent's
 * last child; 'tee' = elbow plus the branch continues below; 'none' = the
 * ancestor branch already ended (blank spacer).
 */
export type ThreadLineSlot = 'line' | 'tee' | 'elbow' | 'none';

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
    /** Nesting-rail rendering plan; attached by the list to its prop copies, like `depth`. **/
    threadLines?: ThreadLineSlot[];
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
