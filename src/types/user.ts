import { FastCommentsSSOSimple } from "fastcomments-typescript";

// examples:
// - Logged into fastcomments.com, or by entering email to comment, and verified their session
// - Secure SSO
export interface FastCommentsLoggedInUser {
    id: string;
    username: string; // from username or display name
    email?: string; // might be missing from sso
    websiteUrl?: string;
    displayLabel?: string;
    authorized: boolean;
    avatarSrc: string | null;
    hasBlockedUsers: boolean;
    sessionId?: string;
}

// entered email, or maybe no email, to comment and never verified their session or fully logged in
export interface FastCommentsAnonUser {
    isAnonSession: boolean;
    id: string;
    username: string; // entered by user
    avatarSrc: string | null;
    authorized: true; // TODO: we can edit our comments in an anon session. but maybe this value shouldn't be true.
    hasBlockedUsers: boolean;
    sessionId?: string;
}

export type FastCommentsSessionUser = FastCommentsLoggedInUser | FastCommentsAnonUser | FastCommentsSSOSimple | null | undefined;
