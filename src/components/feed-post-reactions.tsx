import { useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { FeedPost } from '../types/feed-post';
import type { FastCommentsStore } from '../store/types';
import { reactToFeedPost } from '../services/feed-reactions';
import { showError } from '../services/show-error';
import {
    FeedReactionDescriptor,
    getDefaultFeedReactions,
} from '../resources/feed-reactions';

export interface FeedPostReactionsProps {
    post: FeedPost;
    store: FastCommentsStore;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    /** Override the default 6-emoji set (e.g. host wants a smaller picker). */
    reactions?: FeedReactionDescriptor[];
}

function reactionLabel(
    translations: Record<string, string>,
    key: FeedReactionDescriptor['translationKey']
): string {
    switch (key) {
        case 'FEED_REACTION_THUMBS_UP':
            return translations.FEED_REACTION_THUMBS_UP;
        case 'FEED_REACTION_HEART':
            return translations.FEED_REACTION_HEART;
        case 'FEED_REACTION_LAUGH':
            return translations.FEED_REACTION_LAUGH;
        case 'FEED_REACTION_WOW':
            return translations.FEED_REACTION_WOW;
        case 'FEED_REACTION_SAD':
            return translations.FEED_REACTION_SAD;
        case 'FEED_REACTION_ANGRY':
            return translations.FEED_REACTION_ANGRY;
    }
}

export function FeedPostReactions({
    post,
    store,
    translations,
    styles,
    reactions,
}: FeedPostReactionsProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const reactionSet = reactions ?? getDefaultFeedReactions();
    const reactsMap = post.reacts ?? {};
    const myReacts = post.myReacts ?? {};

    // The Like button owns the default 'l' reaction (parity with Android/web);
    // the chip strip shows every *other* reaction that has a non-zero count.
    const LIKE_KEY = 'l';
    const likeDescriptor = reactionSet.find((r) => r.key === LIKE_KEY);
    const likeCount = reactsMap[LIKE_KEY] ?? 0;
    const likedByMe = !!myReacts[LIKE_KEY];
    const visibleChips = reactionSet.filter(
        (r) => r.key !== LIKE_KEY && (reactsMap[r.key] ?? 0) > 0
    );

    async function send(reactType: string, isUndo: boolean) {
        const result = await reactToFeedPost(store, post.id, reactType, isUndo);
        if ('error' in result) {
            showError(translations.FEED_REACTION_FAILED, result.error);
        }
    }

    const onChipPress = (descriptor: FeedReactionDescriptor) => {
        const alreadyReacted = !!myReacts[descriptor.key];
        void send(descriptor.key, alreadyReacted);
    };

    const onLikePress = () => {
        void send(LIKE_KEY, likedByMe);
    };

    const onPickerItemPress = (descriptor: FeedReactionDescriptor) => {
        const alreadyReacted = !!myReacts[descriptor.key];
        setPickerOpen(false);
        void send(descriptor.key, alreadyReacted);
    };

    return (
        <View
            testID={`feedPostReactions-${post.id}`}
            accessibilityLabel={`feedPostReactions-${post.id}`}
            style={styles.feed?.reactionsRow}
        >
            {visibleChips.map((descriptor) => {
                const count = reactsMap[descriptor.key] ?? 0;
                const isActive = !!myReacts[descriptor.key];
                const chipStyle = isActive
                    ? [styles.feed?.reactionChip, styles.feed?.reactionChipActive]
                    : styles.feed?.reactionChip;
                return (
                    <TouchableOpacity
                        key={descriptor.key}
                        testID={`feedReactionChip-${post.id}-${descriptor.key}`}
                        accessibilityLabel={`feedReactionChip-${post.id}-${descriptor.key}`}
                        accessibilityRole="button"
                        onPress={() => onChipPress(descriptor)}
                        style={chipStyle}
                    >
                        <Text style={styles.feed?.reactionChipGlyph}>{descriptor.glyph}</Text>
                        <Text
                            testID={`feedReactionChipCount-${post.id}-${descriptor.key}`}
                            style={styles.feed?.reactionChipCount}
                        >
                            {String(count)}
                        </Text>
                    </TouchableOpacity>
                );
            })}

            <TouchableOpacity
                testID={`feedReactionLikeButton-${post.id}`}
                accessibilityLabel={`feedReactionLikeButton-${post.id}`}
                accessibilityRole="button"
                accessibilityHint={translations.FEED_REACTION_PICK}
                onPress={onLikePress}
                onLongPress={() => setPickerOpen(true)}
                style={
                    likedByMe
                        ? [styles.feed?.reactionLikeButton, styles.feed?.reactionLikeButtonActive]
                        : styles.feed?.reactionLikeButton
                }
            >
                {likeDescriptor && (
                    <Text style={styles.feed?.reactionChipGlyph}>{likeDescriptor.glyph}</Text>
                )}
                {likeCount > 0 && (
                    <Text
                        testID={`feedReactionLikeCount-${post.id}`}
                        style={styles.feed?.reactionChipCount}
                    >
                        {String(likeCount)}
                    </Text>
                )}
            </TouchableOpacity>

            {pickerOpen && (
                <Modal
                    visible
                    transparent
                    animationType="fade"
                    onRequestClose={() => setPickerOpen(false)}
                >
                    <Pressable
                        style={styles.feed?.reactionPickerOverlay}
                        onPress={() => setPickerOpen(false)}
                    >
                        <Pressable style={styles.feed?.reactionPickerSheet}>
                            {reactionSet.map((descriptor) => (
                                <TouchableOpacity
                                    key={descriptor.key}
                                    testID={`feedReactionPickerItem-${descriptor.key}`}
                                    accessibilityLabel={reactionLabel(translations, descriptor.translationKey)}
                                    accessibilityRole="button"
                                    onPress={() => onPickerItemPress(descriptor)}
                                    style={styles.feed?.reactionPickerItem}
                                >
                                    <Text style={styles.feed?.reactionPickerItemGlyph}>
                                        {descriptor.glyph}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </Pressable>
                    </Pressable>
                </Modal>
            )}
        </View>
    );
}
