// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {Image, Pressable, View, Text, StyleSheet} from 'react-native';
import {FastCommentsImageAsset} from '../types/image-asset';
import {useState} from "react";

export interface NotificationBellProps {
    state: State<FastCommentsState>;
}

export function NotificationBell({state}: NotificationBellProps) {
    if (state.config.disableNotificationBell.get()) {
        return null;
    }
    const notificationCount = state.notificationCount.get()!;
    const bellIconType = notificationCount > 0 ? FastCommentsImageAsset.ICON_BELL_RED : FastCommentsImageAsset.ICON_BELL;
    const [isOpen, setNotificationsListOpen] = useState(false);

    return <View>
        <Pressable onPress={() => setNotificationsListOpen(!isOpen)} style={styles.bellContainer}>
            <Image source={state.imageAssets[bellIconType].get()} style={{width: 22, height: 22}}/>
            <Text>{(notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+')}</Text>
        </Pressable>
        {isOpen && <Text>TODO: notifications list</Text>}
    </View>;
}

const styles = StyleSheet.create({
    bellContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: 'space-between'
    }
});
