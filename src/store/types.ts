import type { StoreApi, UseBoundStore } from 'zustand';
import type { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { FastCommentsBadge, FastCommentsWidgetComment } from 'fastcomments-typescript';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import type { FastCommentsSessionUser } from '../types/user';
import type { ImageAssetConfig } from '../types/image-asset';
import type { UserNotification } from '../types/user-notification';
import type { RNComment } from '../types/react-native-comment';
import type { FeedPost } from '../types/feed-post';
import type {
    FastCommentsSortDirection,
    OnlineUser,
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
    sdk: FastCommentsServerSDK;
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
    /** Set by the open inline reply composer; closing skips the confirm when not dirty. **/
    replyDirtyCheck?: (() => boolean) | null;

    setConfig: (config: FastCommentsRNConfig) => void;
    mergeConfig: (partial: Partial<FastCommentsRNConfig>) => void;
    setCurrentUser: (user: FastCommentsSessionUser) => void;
    setTranslations: (translations: Record<string, string>) => void;
    setIsSiteAdmin: (is: boolean) => void;
    setHasBillingIssue: (has: boolean) => void;
    setBlockingErrorMessage: (msg: string | undefined) => void;
    setModeratingTenantIds: (ids: string[] | undefined) => void;
    setWSIds: (urlIdWS?: string, tenantIdWS?: string, userIdWS?: string | null) => void;
    setReplyDirtyCheck: (check: (() => boolean) | null) => void;
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

/** A presence frame already split into named joins/leaves + an anon-count delta. */
export interface OnlineUsersPresencePayload {
    /** Named (non-anonymous) user ids that just joined. **/
    joinedNamed: string[];
    /** Named user ids that just left. **/
    leftNamed: string[];
    /** Net change to the anonymous-online count (+joins, -leaves). **/
    anonDelta: number;
    /** New total online count (the presence `sc`), if present in the frame. **/
    totalCount?: number;
}

export interface PresenceSlice {
    userPresenceState: UserPresenceState;
    /**
     * Tracks the live WebSocket connection state. Flipped from
     * subscribe-to-changes via `onConnectionStatusChange`. Surfaced by the
     * optional live-status header bar (`config.showLiveStatus`).
     */
    wsConnected: boolean;
    /**
     * Total connected subscriber count for this thread, sourced from
     * presence-update events (`sc` field). Surfaced by the live-status bar.
     */
    subscriberCount: number;
    /**
     * Online users on this page with avatar/name, for the live-chat facepile and
     * user list. Loaded from getOnlineUsers (the same API the web widget uses);
     * refreshed when presence changes. `usersOnlineMap` above is only id->bool.
     */
    onlineUsers: OnlineUser[];
    onlineUsersTotalCount: number;
    onlineUsersAnonCount: number;

    /** Full replace - initial getOnlineUsers load and pagination append. **/
    setOnlineUsers: (users: OnlineUser[], totalCount: number, anonCount: number) => void;
    /** Merge enriched name/avatar into existing online users (by id); never adds new ids. **/
    upsertOnlineUsers: (users: OnlineUser[]) => void;
    /** Remove online users by id (a presence leave). **/
    removeOnlineUsers: (ids: string[]) => void;
    /**
     * Atomically apply a presence frame to the online-users list: add placeholder
     * rows for joined named users, drop left users, adjust the anonymous count,
     * and set the total - so a join/leave never re-fetches the whole list.
     */
    applyOnlineUsersPresence: (payload: OnlineUsersPresencePayload) => void;
    setUsersOnline: (userIds: string[], online: boolean) => void;
    replaceUsersOnlineMap: (map: Record<string, boolean>) => void;
    setUserIdsToCommentIds: (map: Record<string, string[]>) => void;
    addCommentIdForUser: (userId: string, commentId: string) => void;
    setHeartbeatActive: (active: boolean) => void;
    setPresencePollState: (state: UserPresenceState['presencePollState']) => void;
    setWsConnected: (connected: boolean) => void;
    setSubscriberCount: (count: number) => void;
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

export interface FeedPostStatsPatch {
    commentCount?: number | null;
    reacts?: Record<string, number>;
}

export interface FeedSlice {
    feedPostsById: Record<string, FeedPost>;
    feedPostOrder: string[];
    feedHasMore: boolean;
    feedNewPostsCount: number;
    /** Last loaded post id, used as `afterId` cursor on the next page request. */
    feedAfterId: string | undefined;
    feedLoadFailed: boolean;
    /**
     * Active 30s stats-poll timer id. Set when `startFeedStatsPoll` mounts and
     * cleared by `stopFeedStatsPoll`. Stored on the slice so the lifecycle can
     * be tracked without module-global state (tests run multiple SDK instances
     * in the same process).
     */
    feedStatsTimerId?: ReturnType<typeof setInterval>;

    replaceFeedPosts: (posts: FeedPost[]) => void;
    appendFeedPosts: (posts: FeedPost[]) => void;
    prependFeedPost: (post: FeedPost) => void;
    updateFeedPost: (post: FeedPost) => void;
    removeFeedPost: (id: string) => void;
    /**
     * Merge fresh stats (comment count + reaction counts) into existing
     * `feedPostsById` entries. Posts not currently in the store are skipped.
     */
    mergeFeedPostStats: (statsById: Record<string, FeedPostStatsPatch>) => void;
    incFeedNewPostsCount: (delta: number) => void;
    clearFeedNewPostsCount: () => void;
    setFeedHasMore: (hasMore: boolean) => void;
    setFeedAfterId: (id: string | undefined) => void;
    setFeedLoadFailed: (failed: boolean) => void;
    setFeedStatsTimerId: (id: ReturnType<typeof setInterval> | undefined) => void;
    resetFeedForNewContext: () => void;
    /**
     * Apply a reaction count delta and (optionally) update the current user's
     * `myReacts` membership. `delta` is +1 or -1; `myReactsValue` is `true` when
     * the local user just reacted, `false` when they undid, and `undefined`
     * when the change came from a remote user.
     */
    applyFeedPostReactDelta: (
        postId: string,
        reactType: string,
        delta: number,
        myReactsValue?: boolean
    ) => void;
    /**
     * Replace a post's full reactions/myReacts maps. Used by the reactions
     * service when the server confirms an authoritative count and for revert-on-failure.
     */
    setFeedPostReacts: (
        postId: string,
        reacts: Record<string, number> | undefined,
        myReacts: Record<string, boolean> | undefined
    ) => void;
}

export type FastCommentsStoreState = CommentsSlice &
    ConfigSlice &
    PresenceSlice &
    NotificationsSlice &
    FeedSlice;

export type FastCommentsStore = UseBoundStore<StoreApi<FastCommentsStoreState>>;

export type { FastCommentsWidgetComment };
