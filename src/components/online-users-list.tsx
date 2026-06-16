import { View, Image, Text, TouchableOpacity, ScrollView } from 'react-native';
import { FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { getDefaultAvatarSrc } from '../services/default-avatar';

export interface OnlineUsersListProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    onClose?: () => void;
}

/** A panel listing the page's online users (avatar + name + presence dot). */
export function OnlineUsersList({ store, styles, onClose }: OnlineUsersListProps) {
    const onlineUsers = useStoreValue(store, (s) => s.onlineUsers);
    const totalCount = useStoreValue(store, (s) => s.onlineUsersTotalCount);
    const anonCount = useStoreValue(store, (s) => s.onlineUsersAnonCount);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const translations = useStoreValue(store, (s) => s.translations);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    const ou = styles.onlineUsers;
    // Named users we did not load (large rooms) + anonymous users (never named).
    const remaining = Math.max(0, totalCount - onlineUsers.length - anonCount) + anonCount;

    return (
        <View style={ou?.panel} testID="onlineUsersList" accessibilityLabel="onlineUsersList">
            <View style={ou?.panelHeader}>
                <Text style={ou?.panelTitle}>{translations.USERS_ONLINE?.replace('[count]', String(totalCount)) || `${totalCount} Online`}</Text>
                {onClose && (
                    <TouchableOpacity onPress={onClose} testID="onlineUsersListClose" accessibilityLabel="onlineUsersListClose">
                        <Image
                            source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                            style={ou?.panelCloseIcon}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <ScrollView style={ou?.panelScroll}>
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
