import { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { FollowStateProvider, FollowUser } from '../types/follow-state-provider';

export interface FeedFollowPillProps {
    provider: FollowStateProvider;
    user: FollowUser;
    postId: string;
    revision: number;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
}

export function FeedFollowPill({ provider, user, postId, revision, translations, styles }: FeedFollowPillProps) {
    const [isFollowing, setIsFollowing] = useState<boolean>(() => provider.isFollowing(user));
    const [isPending, setIsPending] = useState<boolean>(false);

    useEffect(() => {
        setIsFollowing(provider.isFollowing(user));
        setIsPending(false);
    }, [provider, user, revision]);

    const onPress = useCallback(async () => {
        if (isPending) return;
        const desired = !isFollowing;
        setIsPending(true);
        try {
            const result = await provider.onFollowStateChangeRequested(user, desired);
            setIsFollowing(result.following);
        } finally {
            setIsPending(false);
        }
    }, [provider, user, isFollowing, isPending]);

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
