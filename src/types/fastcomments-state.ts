import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsComment, FastCommentsCommentWithState} from "../components/comment";
import {FastCommentsSessionUser} from "./user";

export interface CommentState {
    replyBoxOpen?: boolean;
    isSaveInProgress?: boolean,
    logoutFailure?: boolean,
    responseFailureById?: string;
    voteFailureById?: string;
    commentRepliesHiddenById?: boolean;
    isEditing?: boolean;
}

export interface FastCommentsState {
    config: FastCommentsCommentWidgetConfig;
    translations: Record<string, string>;  // TODO
    currentUser: FastCommentsSessionUser;
    commentsTree: FastCommentsComment[];
    blockingErrorMessage: string; // TODO
    hasBillingIssue: boolean;
    isSiteAdmin: boolean;
    isDemo: boolean;
    commentsVisible: boolean;
    commentCountOnServer: number;
    commentCountOnClient: number;
    newRootCommentCount: number;
    commentState: Record<string, CommentState>;
    commentsById: Record<string, FastCommentsCommentWithState>;
    page: number;
    pagesLoaded?: number[];
    PAGE_SIZE: 30;
    hasMore: boolean;
    sortDirection: 'OF' | 'NF' | 'MR';
    notificationCount?: number;
}
