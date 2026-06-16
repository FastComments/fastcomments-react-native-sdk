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

// Refresh the online-users list at most this often. Presence frames (p-u) can
// arrive many times per second in a busy room; this caps the getOnlineUsers
// network/render cost while still keeping the facepile reasonably fresh.
const MIN_REFRESH_MS = 4000;

export function LiveStatusBar({ store, styles }: LiveStatusBarProps) {
    const wsConnected = useStoreValue(store, (s) => s.wsConnected);
    const subscriberCount = useStoreValue(store, (s) => s.subscriberCount);
    const translations = useStoreValue(store, (s) => s.translations);
    const [listOpen, setListOpen] = useState(false);

    // Keep the facepile/list fresh on join/leave (subscriberCount changes), but
    // throttle to at most one fetch per MIN_REFRESH_MS. When a refresh is already
    // pending we coalesce into it rather than resetting the timer - a pure
    // trailing debounce would starve under continuous churn and never refresh
    // until a quiet gap. The first change (incl. mount) fires immediately.
    const lastLoadRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (timerRef.current) return; // already scheduled; let it fire
        const wait = Math.max(0, MIN_REFRESH_MS - (Date.now() - lastLoadRef.current));
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            lastLoadRef.current = Date.now();
            void loadOnlineUsers(store);
        }, wait);
    }, [store, subscriberCount]);
    // Clear any pending refresh on unmount only (not on every count change, which
    // would defeat the throttle).
    useEffect(
        () => () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        },
        []
    );

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
