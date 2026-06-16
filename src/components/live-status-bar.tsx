import { Text, View, Modal } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { OnlineUsersFacepile } from './online-users-facepile';
import { OnlineUsersList } from './online-users-list';
import { loadOnlineUsers } from '../services/online-users';

export interface LiveStatusBarProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function LiveStatusBar({ store, styles }: LiveStatusBarProps) {
    const wsConnected = useStoreValue(store, (s) => s.wsConnected);
    const subscriberCount = useStoreValue(store, (s) => s.subscriberCount);
    const translations = useStoreValue(store, (s) => s.translations);
    const [listOpen, setListOpen] = useState(false);

    // Keep the facepile/list fresh: load once, then refresh (debounced) whenever
    // the subscriber count changes (a user joined or left).
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => void loadOnlineUsers(store), 600);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [store, subscriberCount]);

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
