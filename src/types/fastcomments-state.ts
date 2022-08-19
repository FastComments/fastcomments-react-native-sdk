import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from "fastcomments-typescript";
import {FastCommentsSessionUser} from "./user";
import {IconConfig} from "./icon";
import {UserNotification} from "./user-notification";
import {SubscriberInstance} from "../services/subscribe-to-changes";

export interface CommentState {
    replyBoxOpen?: boolean;
    repliesHidden?: boolean;
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

export type FastCommentsSortDirection = 'OF' | 'NF' | 'MR';

export interface FastCommentsState {
    PAGE_SIZE: 30;
    allComments: FastCommentsWidgetComment[];
    apiHost: string;
    wsHost: string;
    blockingErrorMessage?: string; // TODO
    commentCountOnClient: number;
    commentCountOnServer: number;
    commentState: Record<string, CommentState>;
    commentsById: Record<string, FastCommentsWidgetComment>;
    commentsTree: FastCommentsWidgetComment[];
    commentsVisible?: boolean;
    config: FastCommentsCommentWidgetConfig;
    currentUser: FastCommentsSessionUser;
    hasBillingIssue: boolean;
    hasMore: boolean;
    icons: IconConfig;
    instanceId: string; // TODO is this useful since we are not using iframes?
    isDemo: boolean;
    isSiteAdmin: boolean;
    moderatingTenantIds?: string[];
    newRootCommentCount: number;
    notificationCount?: number;
    page: number;
    pagesLoaded: number[];
    sortDirection: FastCommentsSortDirection;
    translations: Record<string, string>;  // TODO
    userNotificationState: UserNotificationState;
    userPresenceState: UserPresenceState;
    urlIdWS?: string;
    tenantIdWS?: string;
    userIdWS?: string;
    lastSubscriberInstance?: SubscriberInstance;
    ssoConfigString?: string;
    render: () => void; // This is kinda gross, but makes migrating from vanillaJS version easy. After benchmarking re-evaluate this mechanism.
}
