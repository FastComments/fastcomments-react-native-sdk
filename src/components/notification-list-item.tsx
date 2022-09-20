// @ts-ignore TODO remove
import * as React from 'react';

import {Image, ImageURISource, View, Text, TouchableOpacity} from "react-native";
import {FastCommentsCallbacks, FastCommentsImageAsset, IFastCommentsStyles, ImageAssetConfig, UserNotification} from "../types";
import {RenderHTMLSource} from "react-native-render-html";
import {getPrettyDate} from '../services/pretty-date';
import {NotificationType} from "fastcomments-typescript";
import {ModalMenu, ModalMenuItem} from "./modal-menu";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {ThreeDot} from "./three-dot";
import {createURLQueryString, makeRequest} from "../services/http";
import {Dispatch, SetStateAction, useState} from "react";

export interface NotificationListItemProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    apiHost: string
    config: FastCommentsRNConfig
    defaultAvatar: ImageURISource
    imageAssets: ImageAssetConfig
    notification: UserNotification
    notificationTranslations: Record<string, string>
    ssoConfigString: string | undefined
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

async function markNotificationRead(apiHost: string, tenantId: string, ssoConfigString: string | undefined, notificationId: string, isRead: boolean) {
    await makeRequest({
        apiHost,
        method: 'POST',
        url: '/user-notifications/' + notificationId + '/mark/' + (isRead ? 'read' : 'unread') + createURLQueryString({
            tenantId: tenantId,
            sso: ssoConfigString
        })
    });
}

async function markNotificationOptedOut(apiHost: string, tenantId: string, ssoConfigString: string | undefined, notificationId: string, isOptedOut: boolean) {
    await makeRequest({
        apiHost,
        method: 'POST',
        url: '/user-notifications/' + notificationId + '/mark-opted/' + (isOptedOut ? 'out' : 'in') + createURLQueryString({
            tenantId: tenantId,
            sso: ssoConfigString
        })
    });
}

export function NotificationListItem({
        apiHost,
        config,
        defaultAvatar,
        imageAssets,
        notification,
        notificationTranslations,
        onNotificationSelected,
        ssoConfigString,
        styles,
        translations,
        width,
    }: NotificationListItemProps
) {
    const [isViewed, setViewed] = useState(notification.viewed);
    const [isOptedOut, setIsOptedOut] = useState(notification.optedOut);
    const notificationMenuItems: ModalMenuItem[] = [
        isViewed ? {
            id: 'mark-unread',
            label: notificationTranslations.NOTIFICATION_MARK_UNREAD,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationRead(apiHost, config.tenantId, ssoConfigString, notification._id, false);
                setViewed(false);
                setModalId(null);
            }
        } : {
            id: 'mark-read',
            label: notificationTranslations.NOTIFICATION_MARK_READ,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationRead(apiHost, config.tenantId, ssoConfigString, notification._id, true);
                setViewed(true);
                setModalId(null);
            }
        },
        isOptedOut ? {
            id: 'undo-opt-out',
            label: notificationTranslations.NOTIFICATION_OPT_IN_FOR_COMMENT,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationOptedOut(apiHost, config.tenantId, ssoConfigString, notification._id, false);
                setIsOptedOut(false);
                setModalId(null);
            }
        } : {
            id: 'opt-out',
            label: notificationTranslations.NOTIFICATION_OPT_OUT_FOR_COMMENT,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationOptedOut(apiHost, config.tenantId, ssoConfigString, notification._id, true);
                setIsOptedOut(true);
                setModalId(null);
            }
        }
    ];
    return <View style={styles.notificationList?.notification}>
        <View style={styles.notificationList?.notificationTop}>
            <TouchableOpacity style={styles.notificationList?.notificationTopTouchable} onPress={() => onNotificationSelected && onNotificationSelected(notification)}>
                <View style={styles.notificationList?.notificationAvatarWrapper}>
                    <Image
                        style={styles.notificationList?.notificationAvatar}
                        source={notification.fromUserAvatarSrc ? {uri: notification.fromUserAvatarSrc} : defaultAvatar}
                    />
                </View>
                <View style={styles.notificationList?.notificationTextWrapper}>
                    <RenderHTMLSource
                        source={{html: getNotificationDisplayHTML(notification, notificationTranslations)}}
                        contentWidth={width}
                    />
                </View>
            </TouchableOpacity>
            <View style={styles.notificationList?.notificationMenu}>
                <ModalMenu
                    closeIcon={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                    styles={styles}
                    items={notificationMenuItems}
                    openButton={
                        <View style={styles.notificationList?.notificationMenuButton}>
                            <ThreeDot styles={styles}/>
                        </View>
                    }
                />
            </View>
        </View>
        <View style={styles.notificationList?.notificationBottom}>
            <View style={isViewed ? styles.notificationList?.notificationIsReadCircle : styles.notificationList?.notificationIsUnreadCircle}/>
            <Text>{getPrettyDate(translations, new Date(notification.createdAt).valueOf())}</Text>
            {notification.pageTitle && <Text style={styles.notificationList?.notificationPageTitle}>{notification.pageTitle}</Text>}
        </View>
    </View>
}
