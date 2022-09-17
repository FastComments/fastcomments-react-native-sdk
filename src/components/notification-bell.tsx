// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsState} from "../types";
import {State} from "@hookstate/core";
import {Image, View, Text, TouchableOpacity, Modal} from 'react-native';
import {FastCommentsImageAsset, ImageAssetConfig} from '../types';
import {useState} from "react";
import {IFastCommentsStyles} from "../types";
import {NotificationList} from "./notification-list";
import {FastCommentsCallbacks} from "../types";

export interface NotificationBellProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    imageAssets: ImageAssetConfig
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

export function NotificationBell({
    imageAssets,
    onNotificationSelected,
    state,
    styles,
    translations
}: NotificationBellProps) {
    const [isOpen, setNotificationsListOpen] = useState(false);
    if (state.config.disableNotificationBell.get()) {
        return null;
    }
    const notificationCount = state.userNotificationState.count.get()!;
    const bellIconType = notificationCount > 0 ? FastCommentsImageAsset.ICON_BELL_RED : (state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_BELL_WHITE : FastCommentsImageAsset.ICON_BELL);

    return <View>
        <TouchableOpacity onPress={() => setNotificationsListOpen(!isOpen)} style={styles.notificationBell?.bellContainer}>
            <Image source={imageAssets[bellIconType]} style={{width: 20, height: 20}}/>
            <Text
                style={notificationCount > 0 ? styles.notificationBell?.bellCountNonZero : styles.notificationBell?.bellCount}>{(notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+')}</Text>
        </TouchableOpacity>
        {isOpen
        && <View style={styles.notificationList?.centeredView}>
            <Modal
                animationType="slide"
                transparent={true}
                onRequestClose={() => {
                    setNotificationsListOpen(false)
                }}
            ><NotificationList
                imageAssets={imageAssets}
                onNotificationSelected={onNotificationSelected}
                state={state.get()}
                styles={styles}
                translations={translations}
            /></Modal>
        </View>
        }
    </View>;
}
