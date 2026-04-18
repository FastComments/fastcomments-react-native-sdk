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
    if (isUserOnline) {
        return <View style={styles.commentUserActivityIcon?.online} />;
    }
    return <View style={styles.commentUserActivityIcon?.offline} />;
}
