import type { StoreApi, UseBoundStore } from 'zustand';
import type { FastCommentsBadge, FastCommentsWidgetComment } from 'fastcomments-typescript';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import type { FastCommentsSessionUser } from '../types/user';
import type { ImageAssetConfig } from '../types/image-asset';
import type { UserNotification } from '../types/user-notification';
import type { RNComment } from '../types/react-native-comment';
import type {
    FastCommentsSortDirection,
    UserNotificationState,
    UserPresenceState,
} from '../types/fastcomments-state';
import type { SubscriberInstance } from '../services/subscribe-to-changes';

export const ROOT_PARENT_KEY = '';

export interface CommentsSlice {
    byId: Record<string, RNComment>;
    childrenByParent: Record<string, string[]>;
    rootOrder: string[];
    pinnedIds: Set<string>;
    hiddenByParent: Record<string, number>;
    nestedCountById: Record<string, number>;
    commentsByUserId: Record<string, Set<string>>;

    page: number;
    pagesLoaded: number[];
    hasMore: boolean;
    commentCountOnClient: number;
    commentCountOnServer: number;
    newRootCommentCount: number;
    sortDirection: FastCommentsSortDirection;
    commentsVisible: boolean;

    replaceAll: (comments: RNComment[], collapseRepliesByDefault: boolean) => void;
    resetForNewContext: () => void;
    upsertComment: (comment: RNComment, newCommentsToBottom: boolean) => void;
    updateComment: (comment: RNComment) => void;
    mergeCommentFields: (id: string, patch: Partial<RNComment>) => void;
    removeComment: (id: string) => void;
    applyVote: (id: string, votes: number, votesUp: number, votesDown: number) => void;
    applyVoteDelta: (
        id: string,
        direction: number,
        isDeletion: boolean,
        isByCurrentUser: boolean
    ) => void;
    applyBadge: (userId: string, badge: FastCommentsBadge, remove: boolean) => void;
    setRepliesHidden: (id: string, hidden: boolean) => void;
    setReplyBoxOpen: (id: string, open: boolean) => void;
    setHiddenChildrenCount: (parentId: string, count: number) => void;
    incHiddenChildrenCount: (parentId: string, delta: number) => void;
    setNewRootCommentCount: (n: number) => void;
    incNewRootCommentCount: (delta: number) => void;
    setPage: (page: number) => void;
    addPageLoaded: (page: number) => void;
    setHasMore: (hasMore: boolean) => void;
    setSortDirection: (direction: FastCommentsSortDirection) => void;
    setCommentsVisible: (visible: boolean) => void;
    setCommentCountOnClient: (count: number) => void;
    setCommentCountOnServer: (count: number) => void;
    incCommentCountOnServer: (delta: number) => void;
    ensureRepliesOpenTo: (commentId: string) => void;
    repositionRoot: (id: string, before: string | undefined, after: string | undefined) => void;
}

export interface ConfigSlice {
    PAGE_SIZE: 30;
    apiHost: string;
    wsHost: string;
    config: FastCommentsRNConfig;
    currentUser: FastCommentsSessionUser;
    translations: Record<string, string>;
    imageAssets: ImageAssetConfig;
    isDemo: boolean;
    isSiteAdmin: boolean;
    instanceId: string;
    moderatingTenantIds?: string[];
    hasBillingIssue: boolean;
    blockingErrorMessage?: string;
    urlIdWS?: string;
    tenantIdWS?: string;
    userIdWS?: string | null;
    lastSubscriberInstance?: SubscriberInstance;
    ssoConfigString?: string;

    setConfig: (config: FastCommentsRNConfig) => void;
    mergeConfig: (partial: Partial<FastCommentsRNConfig>) => void;
    setCurrentUser: (user: FastCommentsSessionUser) => void;
    setTranslations: (translations: Record<string, string>) => void;
    setIsSiteAdmin: (is: boolean) => void;
    setHasBillingIssue: (has: boolean) => void;
    setBlockingErrorMessage: (msg: string | undefined) => void;
    setModeratingTenantIds: (ids: string[] | undefined) => void;
    setWSIds: (urlIdWS?: string, tenantIdWS?: string, userIdWS?: string | null) => void;
    setLastSubscriberInstance: (instance: SubscriberInstance | undefined) => void;
    setSSOConfigString: (s: string | undefined) => void;
    /**
     * Broadcast ids of writes (comments, votes, pins, etc) originated by THIS
     * store instance. The live-event handler uses this set to filter out
     * echoes of the user's own actions. Must be per-store, not module-global,
     * so multiple SDK instances (e.g. two users in tests, or a multi-tenant
     * dashboard) don't suppress each other's events.
     */
    broadcastIdsSent: Set<string>;
    rememberBroadcastId: (id: string) => void;
}

export interface PresenceSlice {
    userPresenceState: UserPresenceState;

    setUsersOnline: (userIds: string[], online: boolean) => void;
    replaceUsersOnlineMap: (map: Record<string, boolean>) => void;
    setUserIdsToCommentIds: (map: Record<string, string[]>) => void;
    addCommentIdForUser: (userId: string, commentId: string) => void;
    setHeartbeatActive: (active: boolean) => void;
    setPresencePollState: (state: UserPresenceState['presencePollState']) => void;
}

export interface NotificationsSlice {
    userNotificationState: UserNotificationState;

    setNotificationsOpen: (open: boolean) => void;
    setNotificationsLoading: (loading: boolean) => void;
    setNotificationsCount: (count: number) => void;
    setNotifications: (notifications: UserNotification[]) => void;
    appendNotifications: (notifications: UserNotification[]) => void;
    setNotificationsPaginationInProgress: (inProgress: boolean) => void;
    setNotificationsSubscribed: (subscribed: boolean) => void;
    incNotificationCount: (delta: number) => void;
    prependNotification: (notification: UserNotification) => void;
}

export type FastCommentsStoreState = CommentsSlice &
    ConfigSlice &
    PresenceSlice &
    NotificationsSlice;

export type FastCommentsStore = UseBoundStore<StoreApi<FastCommentsStoreState>>;

export type { FastCommentsWidgetComment };
