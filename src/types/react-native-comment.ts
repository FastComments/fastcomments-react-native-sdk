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
}
