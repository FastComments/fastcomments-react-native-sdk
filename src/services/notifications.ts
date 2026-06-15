import {FastCommentsRNConfig, GetTranslationsResponse, GetUserUnreadNotificationsCountResponse, UserNotificationTranslations} from "../types";
import {CommonHTTPResponse} from "../types/dto/common-http-response";
import {GetUserNotificationsResponse, UserNotification} from "../types";
import {NotificationType} from "fastcomments-typescript";
import {
    RenderableUserNotification,
    UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum,
    UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum,
    UpdateUserNotificationStatusNewStatusEnum,
} from "fastcomments-sdk";
import type {FastCommentsStore} from "../store/types";

export interface GetUserNotificationsRequest {
    store: FastCommentsStore
    unreadOnly?: boolean
    afterId?: string
}

export interface GetUserUnreadNotificationCountRequest {
    store: FastCommentsStore
}

export interface MarkNotificationReadRequest {
    store: FastCommentsStore
    notificationId: string
    isRead: boolean
}

export interface MarkNotificationOptedOutRequest {
    store: FastCommentsStore
    notificationId: string
    /**
     * The id of the comment whose subscription is being toggled. Required by
     * the typed SDK contract; pull it from the notification's
     * `fromCommentId` (preferred) or `relatedObjectId` field.
     */
    commentId: string
    isOptedOut: boolean
}

interface SubscriptionStateChangeRequest {
    store: FastCommentsStore
    isSubscribed: boolean
}

function getSSO(config: FastCommentsRNConfig): string | undefined {
    return config.sso ? JSON.stringify(config.sso) : undefined;
}

function mapNotification(n: RenderableUserNotification): UserNotification {
    return {
        _id: n.id,
        urlId: n.urlId,
        url: n.url,
        pageTitle: n.pageTitle ?? undefined,
        relatedObjectType: n.relatedObjectType,
        relatedObjectId: n.relatedObjectId,
        viewed: Boolean(n.viewed),
        sent: Boolean(n.sent),
        createdAt: new Date(n.createdAt),
        type: n.type,
        fromCommentId: n.fromCommentId ?? undefined,
        fromUserName: n.fromUserName ?? undefined,
        fromUserId: n.fromUserId ?? undefined,
        fromUserAvatarSrc: n.fromUserAvatarSrc ?? undefined,
        optedOut: n.optedOut,
    };
}

/**
 * Gets a page of last 20 user notifications. Optionally can return only unread notifications.
 */
export async function getUserNotifications(request: GetUserNotificationsRequest): Promise<GetUserNotificationsResponse> {
    const state = request.store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.getUserNotifications({
        tenantId: state.config.tenantId,
        // The server's `isSubscribed` is page-scoped: without urlId it can't
        // report this page's subscription, so the "subscribe to this page"
        // checkbox would reset every time the list reloads (matches the web
        // widget, which passes urlId here "for notification state").
        urlId: state.config.urlId,
        afterId: request.afterId,
        unreadOnly: request.unreadOnly,
        sso: getSSO(state.config),
    });
    return {
        status: response.status,
        code: response.code,
        reason: response.reason,
        translatedError: response.translatedError,
        translations: response.translations,
        notifications: response.notifications.map(mapNotification),
        isSubscribed: response.isSubscribed,
    };
}

export async function getUserUnreadNotificationCount(request: GetUserUnreadNotificationCountRequest): Promise<GetUserUnreadNotificationsCountResponse> {
    const state = request.store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.getUserNotificationCount({
        tenantId: state.config.tenantId,
        sso: getSSO(state.config),
    });
    return {
        status: response.status,
        code: response.code,
        reason: response.reason,
        translatedError: response.translatedError,
        count: response.count,
    };
}

export async function markNotificationRead(request: MarkNotificationReadRequest): Promise<void> {
    const state = request.store.getState();
    const sdk = state.sdk;
    await sdk.publicApi.updateUserNotificationStatus({
        tenantId: state.config.tenantId,
        notificationId: request.notificationId,
        newStatus: request.isRead ? UpdateUserNotificationStatusNewStatusEnum.read : UpdateUserNotificationStatusNewStatusEnum.unread,
        sso: getSSO(state.config),
    });
}

export async function markNotificationOptedOut(request: MarkNotificationOptedOutRequest): Promise<void> {
    const state = request.store.getState();
    const sdk = state.sdk;
    await sdk.publicApi.updateUserNotificationCommentSubscriptionStatus({
        tenantId: state.config.tenantId,
        notificationId: request.notificationId,
        optedInOrOut: request.isOptedOut ? UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum.out : UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum.in,
        commentId: request.commentId,
        sso: getSSO(state.config),
    });
}

export async function getNotificationTranslations(store: FastCommentsStore): Promise<GetTranslationsResponse<UserNotificationTranslations>> {
    const state = store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.getTranslations({
        namespace: 'widgets',
        component: 'comment-ui-notifications-list',
        useFullTranslationIds: true,
        locale: state.config.locale,
    });
    if (!response.translations) {
        throw Error('Could not get notifications list translations!');
    }
    // The SDK types translations as Record<string, string>; this endpoint
    // is documented to return the UserNotificationTranslations key set.
    const typed: GetTranslationsResponse<UserNotificationTranslations> = {
        status: response.status,
        code: response.code,
        reason: response.reason,
        translations: response.translations as Record<UserNotificationTranslations, string>,
    };
    return typed;
}

export function getNotificationDisplayHTML(notification: UserNotification, notificationTranslations: Record<UserNotificationTranslations, string>) {
    const fromUserName = notification.fromUserName ? notification.fromUserName : 'A user'; // TODO should rarely happen but would be good to localize
    switch (notification.type) {
        case NotificationType.VotedMyComment:
            return notificationTranslations.NOTIFICATION_VOTED_MY_COMMENT.replace('[fromUserName]', fromUserName);
        case NotificationType.RepliedToMe:
            return notificationTranslations.NOTIFICATION_REPLIED_TO_ME.replace('[fromUserName]', fromUserName);
        case NotificationType.RepliedTransientChild:
            return notificationTranslations.NOTIFICATION_REPLIED_TRANSIENT_CHILD.replace('[fromUserName]', fromUserName);
        case NotificationType.SubscriptionReplyRoot:
            return notificationTranslations.NOTIFICATION_SUBSCRIPTION_REPLY_ROOT.replace('[fromUserName]', fromUserName);
        case NotificationType.CommentedOnProfile:
            return notificationTranslations.NOTIFICATION_PROFILE_COMMENT.replace('[fromUserName]', fromUserName);
        case NotificationType.DirectMessage:
            return notificationTranslations.NOTIFICATION_DM.replace('[fromUserName]', fromUserName);
        case NotificationType.Mentioned:
            return notificationTranslations.NOTIFICATION_MENTION.replace('[fromUserName]', fromUserName);
    }
    return 'Unsupported Notification Type!';
}

export async function changePageSubscriptionStateForUser(request: SubscriptionStateChangeRequest): Promise<CommonHTTPResponse> {
    const state = request.store.getState();
    const sdk = state.sdk;
    const response = await sdk.publicApi.updateUserNotificationPageSubscriptionStatus({
        tenantId: state.config.tenantId,
        urlId: state.config.urlId ?? '',
        url: state.config.url ?? '',
        pageTitle: state.config.pageTitle ?? '',
        subscribedOrUnsubscribed: request.isSubscribed
            ? UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum.subscribe
            : UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum.unsubscribe,
        sso: getSSO(state.config),
    });
    return {
        status: response.status,
        code: response.code,
        reason: response.reason,
        translatedError: response.translatedError,
    };
}
