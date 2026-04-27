import {FastCommentsRNConfig, GetTranslationsResponse, GetUserUnreadNotificationsCountResponse, UserNotificationTranslations} from "../types";
import {CommonHTTPResponse, getAPIHost, makeRequest} from "./http";
import {GetUserNotificationsResponse, UserNotification} from "../types";
import {NotificationType} from "fastcomments-typescript";
import {FastCommentsServerSDK} from "fastcomments-sdk/server";
import {
    RenderableUserNotification,
    UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum,
    UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum,
    UpdateUserNotificationStatusNewStatusEnum,
} from "fastcomments-sdk";

export interface GetUserNotificationsRequest {
    config: FastCommentsRNConfig
    unreadOnly?: boolean
    afterId?: string
}

export interface GetUserUnreadNotificationCountRequest {
    config: FastCommentsRNConfig
}

export interface MarkNotificationReadRequest {
    config: FastCommentsRNConfig
    notificationId: string
    isRead: boolean
}

export interface MarkNotificationOptedOutRequest {
    config: FastCommentsRNConfig
    notificationId: string
    isOptedOut: boolean
}

interface SubscriptionStateChangeRequest {
    config: FastCommentsRNConfig
    isSubscribed: boolean
}

function getSDK(config: FastCommentsRNConfig): FastCommentsServerSDK {
    return new FastCommentsServerSDK({basePath: getAPIHost(config)});
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
    const sdk = getSDK(request.config);
    const response = await sdk.publicApi.getUserNotifications({
        tenantId: request.config.tenantId,
        afterId: request.afterId,
        unreadOnly: request.unreadOnly,
        sso: getSSO(request.config),
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
    const sdk = getSDK(request.config);
    const response = await sdk.publicApi.getUserNotificationCount({
        tenantId: request.config.tenantId,
        sso: getSSO(request.config),
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
    const sdk = getSDK(request.config);
    await sdk.publicApi.updateUserNotificationStatus({
        tenantId: request.config.tenantId,
        notificationId: request.notificationId,
        newStatus: request.isRead ? UpdateUserNotificationStatusNewStatusEnum.read : UpdateUserNotificationStatusNewStatusEnum.unread,
        sso: getSSO(request.config),
    });
}

export async function markNotificationOptedOut(request: MarkNotificationOptedOutRequest): Promise<void> {
    const sdk = getSDK(request.config);
    // TODO commentId is required by the typed SDK contract but the legacy URL-only call did not pass one.
    // Callers do not currently thread the related comment id through; leave empty until the call sites are updated.
    await sdk.publicApi.updateUserNotificationCommentSubscriptionStatus({
        tenantId: request.config.tenantId,
        notificationId: request.notificationId,
        optedInOrOut: request.isOptedOut ? UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum.out : UpdateUserNotificationCommentSubscriptionStatusOptedInOrOutEnum.in,
        commentId: '',
        sso: getSSO(request.config),
    });
}

export async function getNotificationTranslations(config: FastCommentsRNConfig): Promise<GetTranslationsResponse<UserNotificationTranslations>> {
    let url = '/translations/widgets/comment-ui-notifications-list?useFullTranslationIds=true';
    if (config.locale) {
        url += '&locale=' + config.locale;
    }
    // TODO translations endpoint not in fastcomments-sdk yet; refactor when added
    const response = await makeRequest<GetTranslationsResponse<UserNotificationTranslations>>({
        apiHost: getAPIHost(config),
        method: 'GET',
        url
    });
    if (!response.translations) { // note - makeRequest will already do retries, so ideally this never happens or is very rare.
        throw Error('Could not get notifications list translations!');
    }
    return response;
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
    const sdk = getSDK(request.config);
    const response = await sdk.publicApi.updateUserNotificationPageSubscriptionStatus({
        tenantId: request.config.tenantId,
        urlId: request.config.urlId ?? '',
        url: request.config.url ?? '',
        pageTitle: request.config.pageTitle ?? '',
        subscribedOrUnsubscribed: request.isSubscribed
            ? UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum.subscribe
            : UpdateUserNotificationPageSubscriptionStatusSubscribedOrUnsubscribedEnum.unsubscribe,
        sso: getSSO(request.config),
    });
    return {
        status: response.status,
        code: response.code,
        reason: response.reason,
        translatedError: response.translatedError,
    };
}
