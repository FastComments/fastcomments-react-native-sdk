// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Image, View, Text, TouchableOpacity} from 'react-native';
import {FastCommentsImageAsset} from '../types/image-asset';
import {useState} from "react";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface NotificationBellProps {
    state: State<FastCommentsState>;
    styles: IFastCommentsStyles
}

export function NotificationBell({state, styles}: NotificationBellProps) {
    const [isOpen, setNotificationsListOpen] = useState(false);
    if (state.config.disableNotificationBell.get()) {
        return null;
    }
    const notificationCount = state.notificationCount.get()!;
    const bellIconType = notificationCount > 0 ? FastCommentsImageAsset.ICON_BELL_RED : (state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_BELL_WHITE : FastCommentsImageAsset.ICON_BELL);

    return <View>
        <TouchableOpacity onPress={() => setNotificationsListOpen(!isOpen)} style={styles.notificationBell?.bellContainer}>
            <Image source={state.imageAssets[bellIconType].get()} style={{width: 22, height: 22}}/>
            <Text style={styles.notificationBell?.bellCount}>{(notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+')}</Text>
        </TouchableOpacity>
        {isOpen && <Text>TODO: notifications list</Text>}
    </View>;
}
