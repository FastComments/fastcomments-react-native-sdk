import { useEffect, useState } from 'react';
import { View, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import type { OnlineUser } from '../types/fastcomments-state';
import { useStoreValue } from '../store/hooks';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { ensureOnlineUsersLoaded, loadOfflineUsers } from '../services/online-users';

export interface OnlineUsersListProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    onClose?: () => void;
    /**
     * Fill the parent container (a flex column, like the web sidebar) instead of
     * the default centered modal card. Use when rendering as a sidebar next to
     * the chat.
     */
    fill?: boolean;
    /**
     * Also show an "Offline" section (loaded via getOfflineUsers, paged with a
     * "Load more" button), mirroring the web panel's `usersListIncludeOffline`.
     */
    showOffline?: boolean;
}

/** A panel listing the page's online (and optionally offline) users. */
export function OnlineUsersList({ store, styles, onClose, fill, showOffline }: OnlineUsersListProps) {
    const onlineUsers = useStoreValue(store, (s) => s.onlineUsers);
    const totalCount = useStoreValue(store, (s) => s.onlineUsersTotalCount);
    const anonCount = useStoreValue(store, (s) => s.onlineUsersAnonCount);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const translations = useStoreValue(store, (s) => s.translations);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    // Self-load the snapshot so the list works standalone (e.g. as a sidebar
    // next to the chat); deduped if another widget already loaded it.
    useEffect(() => {
        ensureOnlineUsersLoaded(store);
    }, [store]);

    // Offline users aren't presence-driven, so the panel owns their paginated
    // list. `offlineNext` is null until the first page loads; its afterName drives
    // whether a "Load more" remains.
    const [offlineUsers, setOfflineUsers] = useState<OnlineUser[]>([]);
    const [offlineNext, setOfflineNext] = useState<{ afterUserId: string | null; afterName: string | null } | null>(null);
    const [offlineLoading, setOfflineLoading] = useState(false);

    const fetchOffline = async (append: boolean) => {
        if (offlineLoading) return;
        setOfflineLoading(true);
        const res = await loadOfflineUsers(
            store,
            append && offlineNext
                ? { afterUserId: offlineNext.afterUserId ?? undefined, afterName: offlineNext.afterName ?? undefined }
                : undefined
        );
        setOfflineLoading(false);
        if (!res) return;
        setOfflineUsers((prev) => (append ? [...prev, ...res.users] : res.users));
        setOfflineNext({ afterUserId: res.nextAfterUserId, afterName: res.nextAfterName });
    };

    useEffect(() => {
        if (!showOffline || offlineNext !== null) return; // load the first page once
        void fetchOffline(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showOffline, store]);

    const ou = styles.onlineUsers;
    // Named users we did not load (large rooms) + anonymous users (never named).
    const remaining = Math.max(0, totalCount - onlineUsers.length - anonCount) + anonCount;
    // Singular vs plural, so a lone viewer reads "1 User Online", not "1 users online".
    const countTemplate = (totalCount === 1 ? translations.USER_ONLINE : translations.USERS_ONLINE) || `[count] Online`;
    const title = countTemplate.replace('[count]', String(totalCount));
    const onlineLabel = translations.ONLINE_USERS_SECTION_ONLINE || 'Online';
    const offlineLabel = translations.ONLINE_USERS_SECTION_OFFLINE || 'Offline';
    const loadMoreLabel = translations.ONLINE_USERS_LOAD_MORE || 'Load more';

    const renderRow = (u: OnlineUser, offline: boolean) => (
        <View key={`${offline ? 'off' : 'on'}-${u.id}`} style={ou?.row}>
            <Image
                source={u.avatarSrc ? { uri: u.avatarSrc } : getDefaultAvatarSrc(imageAssets)}
                style={ou?.rowAvatar}
            />
            <Text style={ou?.rowName} numberOfLines={1}>{u.displayName}</Text>
            <View style={offline ? ou?.rowDotOffline : ou?.rowDot} />
        </View>
    );

    const hasMoreOffline = !!offlineNext && offlineNext.afterName !== null;

    return (
        <View style={fill ? ou?.panelFill : ou?.panel} testID="onlineUsersList" accessibilityLabel="onlineUsersList">
            <View style={ou?.panelHeader}>
                <Text style={ou?.panelTitle}>{title}</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} testID="onlineUsersListClose" accessibilityLabel="onlineUsersListClose">
                        <Image
                            source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                            style={ou?.panelCloseIcon}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <ScrollView style={[ou?.panelScroll, fill ? { flex: 1, minHeight: 0 } : null]}>
                {showOffline && <Text style={[ou?.subheader, ou?.subheaderFirst]}>{onlineLabel}</Text>}
                {onlineUsers.map((u) => renderRow(u, false))}
                {remaining > 0 && (
                    <Text style={ou?.moreText}>
                        {(translations.AND_N_MORE_ONLINE || '+[count] more online').replace('[count]', String(remaining))}
                    </Text>
                )}

                {showOffline && offlineUsers.length > 0 && (
                    <>
                        <Text style={ou?.subheader}>{offlineLabel}</Text>
                        {offlineUsers.map((u) => renderRow(u, true))}
                        {hasMoreOffline && (
                            <TouchableOpacity
                                style={ou?.loadMore}
                                disabled={offlineLoading}
                                onPress={() => void fetchOffline(true)}
                                testID="onlineUsersLoadMoreOffline"
                                accessibilityLabel="onlineUsersLoadMoreOffline"
                            >
                                <Text style={ou?.loadMoreText}>{loadMoreLabel}</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
}
