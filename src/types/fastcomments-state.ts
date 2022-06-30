import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsCommentWithState} from "../components/comment";
import {FastCommentsComment} from "./comment";
import {FastCommentsSessionUser} from "./user";

export interface CommentState {
    replyBoxOpen?: boolean;
    isSaveInProgress?: boolean,
    logoutFailure?: boolean,
    responseFailureById?: string;
    voteFailureById?: string;
    commentRepliesHiddenById?: boolean;
    isEditing?: boolean;
    wasPostedCurrentSession?: boolean;
    requiresVerification?: boolean;
}

export enum UserPresencePollStateEnum {
    Disabled = 0,
    Poll = 1
}

export interface UserPresenceState {
    heartbeatActive?: boolean;
    presencePollState?: UserPresencePollStateEnum;
    /** This is only maintained for users the user may saw (left comments etc). **/
    usersOnlineMap: Record<string, boolean>;
    userIdsToCommentIds: Record<string, string[]>;
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
    userPresenceState: UserPresenceState;
}
