import { useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { ensureOnlineUsersLoaded } from '../services/online-users';

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
}

/** A panel listing the page's online users (avatar + name + presence dot). */
export function OnlineUsersList({ store, styles, onClose, fill }: OnlineUsersListProps) {
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

    const ou = styles.onlineUsers;
    // Named users we did not load (large rooms) + anonymous users (never named).
    const remaining = Math.max(0, totalCount - onlineUsers.length - anonCount) + anonCount;
    // Singular vs plural, so a lone viewer reads "1 User Online", not "1 users online".
    const countTemplate = (totalCount === 1 ? translations.USER_ONLINE : translations.USERS_ONLINE) || `[count] Online`;
    const title = countTemplate.replace('[count]', String(totalCount));

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
                {onlineUsers.map((u) => (
                    <View key={u.id} style={ou?.row}>
                        <Image
                            source={u.avatarSrc ? { uri: u.avatarSrc } : getDefaultAvatarSrc(imageAssets)}
                            style={ou?.rowAvatar}
                        />
                        <Text style={ou?.rowName} numberOfLines={1}>{u.displayName}</Text>
                        <View style={ou?.rowDot} />
                    </View>
                ))}
                {remaining > 0 && (
                    <Text style={ou?.moreText}>
                        {(translations.AND_N_MORE_ONLINE || '+[count] more online').replace('[count]', String(remaining))}
                    </Text>
                )}
            </ScrollView>
        </View>
    );
}
