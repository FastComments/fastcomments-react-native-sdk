import { Text, View, Modal } from 'react-native';
import { useEffect, useState } from 'react';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { OnlineUsersFacepile } from './online-users-facepile';
import { OnlineUsersList } from './online-users-list';
import { ensureOnlineUsersLoaded } from '../services/online-users';

export interface LiveStatusBarProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function LiveStatusBar({ store, styles }: LiveStatusBarProps) {
    const wsConnected = useStoreValue(store, (s) => s.wsConnected);
    const subscriberCount = useStoreValue(store, (s) => s.subscriberCount);
    const translations = useStoreValue(store, (s) => s.translations);
    const [listOpen, setListOpen] = useState(false);

    // Load the initial online-users snapshot once (deduped across widgets). Join/
    // leave churn is then applied incrementally from presence frames (see
    // applyOnlineUsersPresenceUpdate in live.ts) - no full re-fetch per change.
    useEffect(() => {
        ensureOnlineUsersLoaded(store);
    }, [store]);

    const statusText = wsConnected ? translations.LIVE : translations.DISCONNECTED;
    // Fall back to a plain string when the server did not send the live-chat
    // online-count translations, so the count never silently disappears.
    const userCountTemplate =
        (subscriberCount === 1 ? translations.USER_ONLINE : translations.USERS_ONLINE) || '[count] online';
    const userCountString = userCountTemplate.replace('[count]', String(subscriberCount));

    const bar = styles.liveStatusBar;

    return (
        <View style={bar?.root}>
            <View
                style={[
                    bar?.connectionChip,
                    wsConnected ? bar?.connectionChipConnected : bar?.connectionChipDisconnected,
                ]}
            >
                <View
                    testID="connectionDot"
                    accessibilityLabel="connectionDot"
                    style={[
                        bar?.connectionDot,
                        wsConnected ? bar?.connectionDotConnected : bar?.connectionDotDisconnected,
                    ]}
                />
                <Text
                    testID="connectionStatusText"
                    accessibilityLabel="connectionStatusText"
                    style={bar?.connectionText}
                >
                    {statusText}
                </Text>
            </View>
            <View style={bar?.right}>
                <OnlineUsersFacepile store={store} styles={styles} onPress={() => setListOpen(true)} />
                {subscriberCount >= 1 && userCountString !== undefined ? (
                    <View style={bar?.userCountChip}>
                        <Text
                            testID="userCountText"
                            accessibilityLabel="userCountText"
                            style={bar?.userCountText}
                        >
                            {userCountString}
                        </Text>
                    </View>
                ) : null}
            </View>
            <Modal visible={listOpen} transparent animationType="fade" onRequestClose={() => setListOpen(false)}>
                <View style={styles.onlineUsers?.modalScrim}>
                    <OnlineUsersList store={store} styles={styles} onClose={() => setListOpen(false)} />
                </View>
            </Modal>
        </View>
    );
}
