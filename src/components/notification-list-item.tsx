// @ts-ignore TODO remove
import * as React from 'react';

import {Image, ImageURISource, View, Text, TouchableOpacity} from "react-native";
import {FastCommentsCallbacks, IFastCommentsStyles, UserNotification} from "../types";
import {RenderHTMLSource} from "react-native-render-html";
import {getPrettyDate} from '../services/pretty-date';
import {NotificationType} from "fastcomments-typescript";

export interface NotificationListItemProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    defaultAvatar: ImageURISource,
    notification: UserNotification
    notificationTranslations: Record<string, string>
    styles: IFastCommentsStyles
    translations: Record<string, string>
    width: number
}

function getNotificationDisplayHTML(notification: UserNotification, notificationTranslations: Record<string, string>) {
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
    }
    return 'Unsupported Notification Type!';
}

export function NotificationListItem({
        defaultAvatar,
        notification,
        translations,
        notificationTranslations,
        styles,
        onNotificationSelected,
        width,
    }: NotificationListItemProps
) {
    return <TouchableOpacity style={styles.notificationList?.notification}
                             onPress={() => onNotificationSelected && onNotificationSelected(notification)}>
        <View style={styles.notificationList?.notificationTop}>
            <View style={styles.notificationList?.notificationAvatarWrapper}>
                <Image
                    style={styles.notificationList?.notificationAvatar}
                    source={notification.fromUserAvatarSrc ? {uri: notification.fromUserAvatarSrc} : defaultAvatar}
                />
            </View>
            <RenderHTMLSource
                source={{html: getNotificationDisplayHTML(notification, notificationTranslations)}}
                contentWidth={width}
            />
        </View>
        <View style={styles.notificationList?.notificationBottom}>
            <Text>{getPrettyDate(translations, new Date(notification.createdAt).valueOf())}</Text>
            {notification.pageTitle && <Text style={styles.notificationList?.notificationPageTitle}>{notification.pageTitle}</Text>}
        </View>
    </TouchableOpacity>
}
