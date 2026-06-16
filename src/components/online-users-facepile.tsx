import { useEffect } from 'react';
import { View, Image, Text, TouchableOpacity } from 'react-native';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { ensureOnlineUsersLoaded } from '../services/online-users';

export interface OnlineUsersFacepileProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    /** Opens the full online-users list (e.g. a modal). **/
    onPress?: () => void;
    /** Max avatars to show before collapsing the rest into a "+N". **/
    max?: number;
}

/** A compact row of overlapping online-user avatars (live-chat header), like the web facepile. */
export function OnlineUsersFacepile({ store, styles, onPress, max = 4 }: OnlineUsersFacepileProps) {
    const onlineUsers = useStoreValue(store, (s) => s.onlineUsers);
    const totalCount = useStoreValue(store, (s) => s.onlineUsersTotalCount);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);

    // Self-load the snapshot so this works standalone (e.g. next to the chat
    // with the header hidden); deduped if the header already loaded it.
    useEffect(() => {
        ensureOnlineUsersLoaded(store);
    }, [store]);

    if (!onlineUsers.length) return null;
    const shown = onlineUsers.slice(0, max);
    const overflow = Math.max(0, totalCount - shown.length);
    const ou = styles.onlineUsers;

    const content = (
        <View style={ou?.facepile} testID="onlineUsersFacepile" accessibilityLabel="onlineUsersFacepile">
            {shown.map((u, i) => (
                <View key={u.id} style={[ou?.faceWrapper, i > 0 ? ou?.faceWrapperOverlap : null]}>
                    <Image
                        source={u.avatarSrc ? { uri: u.avatarSrc } : getDefaultAvatarSrc(imageAssets)}
                        style={ou?.faceAvatar}
                    />
                    <View style={ou?.faceDot} />
                </View>
            ))}
            {overflow > 0 && (
                <View style={[ou?.faceWrapper, ou?.faceWrapperOverlap, ou?.faceOverflow]}>
                    <Text style={ou?.faceOverflowText}>+{overflow}</Text>
                </View>
            )}
        </View>
    );

    return onPress ? (
        <TouchableOpacity onPress={onPress} testID="onlineUsersFacepileButton" accessibilityLabel="onlineUsersFacepileButton">
            {content}
        </TouchableOpacity>
    ) : (
        content
    );
}
