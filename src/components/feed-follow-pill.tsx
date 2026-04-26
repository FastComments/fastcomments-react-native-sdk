import { useCallback } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { setFollowState } from '../services/feed-follow';

export interface FeedFollowPillProps {
    store: FastCommentsStore;
    postId: string;
    targetUserId: string;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
}

export function FeedFollowPill({ store, postId, targetUserId, translations, styles }: FeedFollowPillProps) {
    const isFollowing = useStoreValue(store, (s) => s.followingUserIds.has(targetUserId));
    const isPending = useStoreValue(store, (s) => s.followPendingUserIds.has(targetUserId));

    const onPress = useCallback(() => {
        if (isPending) return;
        void setFollowState(store, targetUserId, !isFollowing);
    }, [store, targetUserId, isFollowing, isPending]);

    const label = isFollowing ? translations.FEED_FOLLOWING : translations.FEED_FOLLOW;
    const pillStyle = isFollowing ? styles.feed?.followPillFollowing : styles.feed?.followPill;
    const textStyle = isFollowing ? styles.feed?.followPillFollowingText : styles.feed?.followPillText;

    return (
        <TouchableOpacity
            testID={`feedFollowPill-${postId}`}
            accessibilityLabel={`feedFollowPill-${postId}`}
            accessibilityRole="button"
            disabled={isPending}
            onPress={onPress}
            style={pillStyle}
        >
            <Text testID={`feedFollowPillText-${postId}`} style={textStyle}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}
