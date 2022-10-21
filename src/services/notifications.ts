import {FastCommentsRNConfig, GetTranslationsResponse, GetUserUnreadNotificationsCountResponse, UserNotificationTranslations} from "../types";
import {CommonHTTPResponse, createURLQueryString, getAPIHost, makeRequest} from "./http";
import {mergeSimpleSSO} from "./sso";
import {GetUserNotificationsResponse, UserNotification} from "../types";
import {NotificationType} from "fastcomments-typescript";

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

/**
 * Gets a page of last 20 user notifications. Optionally can return only unread notifications.
 */
export async function getUserNotifications(request: GetUserNotificationsRequest): Promise<GetUserNotificationsResponse> {
    if (request.config.sso) {
        mergeSimpleSSO(request.config);
    }
    return await makeRequest<GetUserNotificationsResponse>({
        apiHost: getAPIHost(request.config),
        method: 'GET',
        url: '/user-notifications' + createURLQueryString({
            tenantId: request.config.tenantId,
            urlId: request.config.urlId, // for notification subscription state
            sso: request.config.sso ? JSON.stringify(request.config.sso) : undefined,
            afterId: request.afterId,
            unreadOnly: request.unreadOnly ? 'true' : 'false'
        })
    });
}

export async function getUserUnreadNotificationCount(request: GetUserUnreadNotificationCountRequest): Promise<GetUserUnreadNotificationsCountResponse> {
    if (request.config.sso) {
        mergeSimpleSSO(request.config);
    }
    return await makeRequest<GetUserUnreadNotificationsCountResponse>({
        apiHost: getAPIHost(request.config),
        method: 'GET',
        url: '/user-notifications/get-count' + createURLQueryString({
            tenantId: request.config.tenantId,
            urlId: request.config.urlId, // for notification subscription state
            sso: request.config.sso ? JSON.stringify(request.config.sso) : undefined,
        })
    });
}

export async function markNotificationRead(request: MarkNotificationReadRequest): Promise<CommonHTTPResponse> {
    if (request.config.sso) {
        mergeSimpleSSO(request.config);
    }
    return await makeRequest({
        apiHost: getAPIHost(request.config),
        method: 'POST',
        url: '/user-notifications/' + request.notificationId + '/mark/' + (request.isRead ? 'read' : 'unread') + createURLQueryString({
            tenantId: request.config.tenantId,
            sso: request.config.sso ? JSON.stringify(request.config.sso) : undefined
        })
    });
}

export async function markNotificationOptedOut(request: MarkNotificationOptedOutRequest): Promise<CommonHTTPResponse> {
    if (request.config.sso) {
        mergeSimpleSSO(request.config);
    }
    return await makeRequest({
        apiHost: getAPIHost(request.config),
        method: 'POST',
        url: '/user-notifications/' + request.notificationId + '/mark-opted/' + (request.isOptedOut ? 'out' : 'in') + createURLQueryString({
            tenantId: request.config.tenantId,
            sso: request.config.sso ? JSON.stringify(request.config.sso) : undefined
        })
    });
}

export async function getNotificationTranslations(config: FastCommentsRNConfig): Promise<GetTranslationsResponse<UserNotificationTranslations>> {
    let url = '/translations/widgets/comment-ui-notifications-list?useFullTranslationIds=true';
    if (config.locale) {
        url += '&locale=' + config.locale;
    }
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
    if (request.config.sso) {
        mergeSimpleSSO(request.config);
    }
    return await makeRequest<CommonHTTPResponse>({
        apiHost: getAPIHost(request.config),
        method: 'POST',
        url: '/user-notifications/set-subscription-state/' + (request.isSubscribed ? 'subscribe' : 'unsubscribe') + '/' + createURLQueryString({
            tenantId: request.config.tenantId,
            urlId: request.config.url,
            url: request.config.url,
            pageTitle: request.config.pageTitle,
            sso: request.config.sso ? JSON.stringify(request.config.sso) : undefined
        })
    });
}
