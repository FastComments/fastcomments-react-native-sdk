import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsSessionUser} from "./user";
import {ImageAssetConfig} from "./image-asset";
import {UserNotification} from "./user-notification";
import {SubscriberInstance} from "../services/subscribe-to-changes";
import {RNComment} from "./react-native-comment";

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
}

export type FastCommentsSortDirection = 'OF' | 'NF' | 'MR';

export interface FastCommentsState {
    PAGE_SIZE: 30;
    allComments: RNComment[];
    apiHost: string;
    wsHost: string;
    blockingErrorMessage?: string; // TODO
    commentCountOnClient: number;
    commentCountOnServer: number;
    commentsById: Record<string, RNComment>;
    commentsTree: RNComment[];
    commentsVisible?: boolean;
    config: FastCommentsCommentWidgetConfig;
    currentUser: FastCommentsSessionUser;
    hasBillingIssue: boolean;
    hasMore: boolean;
    imageAssets: ImageAssetConfig;
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
    userIdWS?: string | null;
    lastSubscriberInstance?: SubscriberInstance;
    ssoConfigString?: string;
}
