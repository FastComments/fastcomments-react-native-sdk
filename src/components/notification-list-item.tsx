import {Image, ImageURISource, View, Text, TouchableOpacity} from "react-native";
import {FastCommentsCallbacks, FastCommentsImageAsset, IFastCommentsStyles, ImageAssetConfig, UserNotification} from "../types";
import {RenderHTMLSource} from "react-native-render-html";
import {getPrettyDate} from '../services/pretty-date';
import {ModalMenu, ModalMenuItem} from "./modal-menu";
import {FastCommentsRNConfig, UserNotificationTranslations} from "../types";
import {ThreeDot} from "./three-dot";
import {Dispatch, SetStateAction, useState} from "react";
import {getNotificationDisplayHTML, markNotificationOptedOut, markNotificationRead} from "../services/notifications";
import {ImmutableObject} from "@hookstate/core";

export interface NotificationListItemProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    config: ImmutableObject<FastCommentsRNConfig>
    defaultAvatar: ImageURISource
    imageAssets: ImageAssetConfig
    notification: UserNotification
    notificationTranslations: Record<UserNotificationTranslations, string>
    styles: IFastCommentsStyles
    translations: Record<string, string>
    width: number
}

export function NotificationListItem({
        config,
        defaultAvatar,
        imageAssets,
        notification,
        notificationTranslations,
        onNotificationSelected,
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
                await markNotificationRead({
                    config,
                    notificationId: notification._id,
                    isRead: false
                });
                setViewed(false);
                setModalId(null);
            }
        } : {
            id: 'mark-read',
            label: notificationTranslations.NOTIFICATION_MARK_READ,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationRead({
                    config,
                    notificationId: notification._id,
                    isRead: true
                });
                setViewed(true);
                setModalId(null);
            }
        },
        isOptedOut ? {
            id: 'undo-opt-out',
            label: notificationTranslations.NOTIFICATION_OPT_IN_FOR_COMMENT,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationOptedOut({
                    config,
                    notificationId: notification._id,
                    isOptedOut: false
                });
                setIsOptedOut(false);
                setModalId(null);
            }
        } : {
            id: 'opt-out',
            label: notificationTranslations.NOTIFICATION_OPT_OUT_FOR_COMMENT,
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await markNotificationOptedOut({
                    config,
                    notificationId: notification._id,
                    isOptedOut: true
                });
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
