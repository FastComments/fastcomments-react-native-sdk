// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Image, View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {FastCommentsImageAsset} from '../types/image-asset';
import {useState} from "react";

export interface NotificationBellProps {
    state: State<FastCommentsState>;
}

export function NotificationBell({state}: NotificationBellProps) {
    const [isOpen, setNotificationsListOpen] = useState(false);
    if (state.config.disableNotificationBell.get()) {
        return null;
    }
    const notificationCount = state.notificationCount.get()!;
    const bellIconType = notificationCount > 0 ? FastCommentsImageAsset.ICON_BELL_RED : FastCommentsImageAsset.ICON_BELL;

    return <View>
        <TouchableOpacity onPress={() => setNotificationsListOpen(!isOpen)} style={styles.bellContainer}>
            <Image source={state.imageAssets[bellIconType].get()} style={{width: 22, height: 22}}/>
            <Text style={styles.bellCount}>{(notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+')}</Text>
        </TouchableOpacity>
        {isOpen && <Text>TODO: notifications list</Text>}
    </View>;
}

const styles = StyleSheet.create({
    bellContainer: {
        width: 35,
        alignItems: "center",
    },
    bellCount: {
        position: "absolute",
        top: 0,
        right: 0,
        fontSize: 11
    }
});
