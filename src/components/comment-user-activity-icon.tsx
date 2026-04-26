import { View } from 'react-native';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface CommentUserActivityIconProps {
    disableLiveCommenting?: boolean;
    userId?: string;
    anonUserId?: string;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function CommentUserActivityIcon({
    disableLiveCommenting,
    userId,
    anonUserId,
    store,
    styles,
}: CommentUserActivityIconProps) {
    const usersOnlineMap = useStoreValue(store, (s) => s.userPresenceState.usersOnlineMap);

    if (disableLiveCommenting) return null;

    const isUserOnline =
        (userId && usersOnlineMap[userId]) || (anonUserId && usersOnlineMap[anonUserId]);
    const idForTest = userId || anonUserId || 'unknown';
    if (isUserOnline) {
        return (
            <View
                testID={`onlineIndicator-${idForTest}`}
                accessibilityLabel="onlineIndicator"
                style={styles.commentUserActivityIcon?.online}
            />
        );
    }
    return (
        <View
            testID={`offlineIndicator-${idForTest}`}
            accessibilityLabel="offlineIndicator"
            style={styles.commentUserActivityIcon?.offline}
        />
    );
}
