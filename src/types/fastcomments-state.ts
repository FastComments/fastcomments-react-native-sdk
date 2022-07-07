import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsSessionUser} from "./user";
import {FastCommentsIconType} from "./icon";
import {UserNotification} from "./user-notification";

export interface CommentState {
    replyBoxOpen?: boolean;
    isSaveInProgress?: boolean,
    logoutFailure?: boolean,
    responseFailure?: string;
    voteFailure?: string;
    repliesHidden?: boolean;
    isEditing?: boolean;
    editKey?: string;
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

export interface UserNotificationState {
    isOpen: boolean;
    isLoading: boolean;
    count: number;
    notifications: UserNotification[];
    isPaginationInProgress: boolean;
    isSubscribed: boolean;
    reRenderCallback?: Function; // TODO used in sdk?
    pageClickEventListener?: Function; // TODO used in sdk?
}

export interface FastCommentsState {
    PAGE_SIZE: 30;
    allComments: FastCommentsWidgetComment[];
    apiHost: string;
    blockingErrorMessage?: string; // TODO
    commentCountOnClient: number;
    commentCountOnServer: number;
    commentState: Record<string, CommentState>;
    commentsById: Record<string, FastCommentsWidgetComment>;
    commentsTree: FastCommentsWidgetComment[];
    commentsVisible: boolean;
    config: FastCommentsCommentWidgetConfig;
    currentUser: FastCommentsSessionUser;
    hasBillingIssue: boolean;
    hasMore: boolean;
    icons: Record<FastCommentsIconType, string>;
    instanceId: string; // TODO is this useful since we are not using iframes?
    isDemo: boolean;
    isSiteAdmin: boolean;
    moderatingTenantIds?: string[];
    newRootCommentCount: number;
    notificationCount?: number;
    page: number;
    pagesLoaded?: number[];
    sortDirection: 'OF' | 'NF' | 'MR';
    translations: Record<string, string>;  // TODO
    userNotificationState: UserNotificationState;
    userPresenceState: UserPresenceState;
}
