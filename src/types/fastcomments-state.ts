import {FastCommentsSessionUser} from "./user";
import {ImageAssetConfig} from "./image-asset";
import {UserNotification} from "./user-notification";
import {SubscriberInstance} from "../services/subscribe-to-changes";
import {RNComment} from "./react-native-comment";
import {FastCommentsRNConfig} from "./react-native-config";

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
    config: FastCommentsRNConfig;
    currentUser: FastCommentsSessionUser;
    hasBillingIssue: boolean;
    hasMore: boolean;
    imageAssets: ImageAssetConfig;
    isDemo: boolean;
    isSiteAdmin: boolean;
    moderatingTenantIds?: string[];
    newRootCommentCount: number;
    page: number;
    pagesLoaded: number[];
    sortDirection: FastCommentsSortDirection;
    translations: Record<string, string>;
    userNotificationState: UserNotificationState;
    userPresenceState: UserPresenceState;
    urlIdWS?: string;
    tenantIdWS?: string;
    userIdWS?: string | null;
    lastSubscriberInstance?: SubscriberInstance;
    ssoConfigString?: string;
}
