import { View, ViewStyle } from 'react-native';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface CommentUserActivityIconProps {
    disableLiveCommenting?: boolean;
    userId?: string;
    anonUserId?: string;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    /** Override the default online style. Used when rendering as an avatar badge. */
    onlineStyle?: ViewStyle;
    /** Override the default offline style. Used when rendering as an avatar badge. */
    offlineStyle?: ViewStyle;
}

export function CommentUserActivityIcon({
    disableLiveCommenting,
    userId,
    anonUserId,
    store,
    styles,
    onlineStyle,
    offlineStyle,
}: CommentUserActivityIconProps) {
    const usersOnlineMap = useStoreValue(store, (s) => s.userPresenceState.usersOnlineMap);

    if (disableLiveCommenting) return null;
    // Anonymous users have no presence channel; do not render an indicator.
    if (!userId) return null;

    const isUserOnline = !!usersOnlineMap[userId] || (!!anonUserId && !!usersOnlineMap[anonUserId]);
    const idForTest = userId;
    if (isUserOnline) {
        return (
            <View
                testID={`onlineIndicator-${idForTest}`}
                accessibilityLabel="onlineIndicator"
                style={onlineStyle ?? styles.commentUserActivityIcon?.online}
            />
        );
    }
    return (
        <View
            testID={`offlineIndicator-${idForTest}`}
            accessibilityLabel="offlineIndicator"
            style={offlineStyle ?? styles.commentUserActivityIcon?.offline}
        />
    );
}
