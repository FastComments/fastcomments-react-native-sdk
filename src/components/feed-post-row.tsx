import { memo, useMemo, useState } from 'react';
import { Image, Modal, Share, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import RenderHtml, { type MixedStyleDeclaration } from 'react-native-render-html';
import type { FeedPost } from '../types/feed-post';
import type { FeedCustomToolbarButton } from '../types/feed-custom-toolbar-button';
import type { IFastCommentsStyles, FastCommentsCallbacks } from '../types';
import { FastCommentsImageAsset } from '../types';
import type { FastCommentsStore } from '../store/types';
import type { FastCommentsSessionUser } from '../types/user';
import type { FollowStateProvider } from '../types/follow-state-provider';
import { getPrettyDate } from '../services/pretty-date';
import { buildPostCommentsConfig, deleteFeedPost } from '../services/feed';
import { showConfirmDialog } from '../services/dialogs';
import { getDefaultAvatarSrc } from '../services/default-avatar';
import { FeedCustomToolbarButtonView } from './feed-custom-toolbar-button';
import { FeedFollowPill } from './feed-follow-pill';
import { FeedPostMediaGallery } from './feed-post-media-gallery';
import { FeedPostReactions } from './feed-post-reactions';
import { FastCommentsLiveCommenting } from './live-commenting';

export interface FeedPostRowProps {
    post: FeedPost;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    customToolbarButtons?: FeedCustomToolbarButton[];
    /** Store reference. Required for reactions/comments/delete; if absent those are suppressed. */
    store?: FastCommentsStore;
    /** Forwarded to the per-post comments widget composer. */
    callbacks?: FastCommentsCallbacks;
    /** Viewer user; when it matches the author the follow pill is hidden and the delete menu shows. */
    currentUser?: FastCommentsSessionUser;
    followStateProvider?: FollowStateProvider;
    followStateRevision: number;
}

function getCurrentUserId(user: FastCommentsSessionUser | undefined): string | undefined {
    if (user && typeof user === 'object' && 'id' in user) {
        const id = (user as { id?: unknown }).id;
        if (typeof id === 'string' && id.length > 0) return id;
    }
    return undefined;
}

function decodeEntities(input: string): string {
    return input
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function stripHtml(input: string | undefined): string {
    if (!input) return '';
    return decodeEntities(input.replace(/<[^>]*>/g, '')).trim();
}

function toEpoch(value: FeedPost['createdAt']): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Date.parse(value) || Date.now();
    if (value instanceof Date) return value.getTime();
    return Date.now();
}

async function sharePost(post: FeedPost) {
    const text = post.title || stripHtml(post.contentHTML) || '';
    try {
        const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { share?: (d: unknown) => Promise<void> }) : undefined;
        if (nav?.share) {
            await nav.share({ title: post.title, text });
            return;
        }
        await Share.share({ title: post.title, message: text });
    } catch {
        // user cancelled / share unavailable - no-op
    }
}

function FeedPostRowImpl({ post, translations, styles, customToolbarButtons, store, callbacks, currentUser, followStateProvider, followStateRevision }: FeedPostRowProps) {
    const { width } = useWindowDimensions();
    const [commentsOpen, setCommentsOpen] = useState(false);
    // config + imageAssets are stable for the store's lifetime, so read them
    // non-reactively (avoids a conditional hook when `store` is absent).
    const snapshot = store?.getState();
    const feedConfig = snapshot?.config;
    const imageAssets = snapshot?.imageAssets;

    const author = post.fromUserDisplayName ?? '';
    const ts = toEpoch(post.createdAt);
    const date = getPrettyDate(translations, ts);

    const visibleButtons = (customToolbarButtons ?? []).filter((button) => !button.visible || button.visible(post));
    const viewerId = getCurrentUserId(currentUser);
    const showFollowPill = !!followStateProvider && !!post.fromUserId && !!viewerId && post.fromUserId !== viewerId;
    const canDelete = !!store && !!viewerId && !!post.fromUserId && post.fromUserId === viewerId;
    const f = styles.feed;

    const contentHTML = post.contentHTML;
    const commentsConfig = useMemo(
        () => (store && feedConfig ? buildPostCommentsConfig(post, feedConfig) : undefined),
        [store, feedConfig, post]
    );

    const avatarSource = post.fromUserAvatar
        ? { uri: post.fromUserAvatar }
        : imageAssets
        ? getDefaultAvatarSrc(imageAssets)
        : undefined;

    const onDelete = () => {
        if (!store) return;
        showConfirmDialog({
            title: translations.FEED_DELETE_POST_TITLE || translations.DELETE || 'Delete post',
            message: translations.FEED_DELETE_POST_CONFIRM || 'Delete this post?',
            confirmText: translations.DELETE || 'Delete',
            cancelText: translations.CANCEL || translations.DISMISS || 'Cancel',
            destructive: true,
            onConfirm: () => void deleteFeedPost(store, post.id),
            onCancel: () => undefined,
        });
    };

    return (
        <View testID={`feedPostRow-${post.id}`} accessibilityLabel={`feedPostRow-${post.id}`} style={f?.post}>
            <View style={f?.postHeader}>
                {avatarSource ? <Image style={f?.postAvatar} source={avatarSource} /> : null}
                <View style={f?.postHeaderText}>
                    {author ? <Text style={f?.postAuthor}>{author}</Text> : null}
                    {date ? <Text style={f?.postDate}>{date}</Text> : null}
                </View>
                {showFollowPill && followStateProvider !== undefined && post.fromUserId !== undefined ? (
                    <FeedFollowPill
                        provider={followStateProvider}
                        user={{ id: post.fromUserId, displayName: post.fromUserDisplayName ?? undefined }}
                        postId={post.id}
                        revision={followStateRevision}
                        translations={translations}
                        styles={styles}
                    />
                ) : null}
                {canDelete ? (
                    <TouchableOpacity
                        testID={`feedPostMenu-${post.id}`}
                        accessibilityLabel="feedPostMenu"
                        style={f?.postMenuButton}
                        onPress={onDelete}
                    >
                        <View style={f?.postMenuDot} />
                        <View style={f?.postMenuDot} />
                        <View style={f?.postMenuDot} />
                    </TouchableOpacity>
                ) : null}
            </View>

            {post.title ? <Text style={f?.postTitle}>{post.title}</Text> : null}
            {contentHTML && stripHtml(contentHTML) ? (
                <RenderHtml source={{ html: contentHTML }} contentWidth={Math.max(0, width - 32)} baseStyle={f?.postContent as MixedStyleDeclaration | undefined} />
            ) : null}

            {post.media && post.media.length > 0 ? (
                <FeedPostMediaGallery postId={post.id} media={post.media} styles={styles} />
            ) : null}

            {store ? (
                <FeedPostReactions post={post} store={store} translations={translations} styles={styles} />
            ) : null}

            {store ? (
                <View style={f?.postActions}>
                    <TouchableOpacity
                        testID={`feedPostCommentButton-${post.id}`}
                        accessibilityLabel="feedPostCommentButton"
                        style={f?.postActionButton}
                        onPress={() => setCommentsOpen(true)}
                    >
                        <Text style={f?.postActionLabel}>
                            {(translations.FEED_COMMENTS || 'Comments')}
                            {typeof post.commentCount === 'number' && post.commentCount > 0 ? ` (${post.commentCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        testID={`feedPostShareButton-${post.id}`}
                        accessibilityLabel="feedPostShareButton"
                        style={f?.postActionButton}
                        onPress={() => void sharePost(post)}
                    >
                        <Text style={f?.postActionLabel}>{translations.FEED_SHARE || 'Share'}</Text>
                    </TouchableOpacity>
                </View>
            ) : null}

            {visibleButtons.length > 0 ? (
                <View testID={`feedCustomToolbar-${post.id}`} accessibilityLabel={`feedCustomToolbar-${post.id}`} style={f?.customToolbar}>
                    {visibleButtons.map((button) => (
                        <FeedCustomToolbarButtonView key={button.id} button={button} post={post} styles={styles} />
                    ))}
                </View>
            ) : null}

            {commentsConfig ? (
                <Modal visible={commentsOpen} animationType="slide" transparent onRequestClose={() => setCommentsOpen(false)}>
                    <View style={f?.commentsModalScrim}>
                        <View style={f?.commentsModalSheet}>
                            <View style={f?.commentsModalHeader}>
                                <Text style={f?.commentsModalTitle}>
                                    {post.title || translations.FEED_COMMENTS || 'Comments'}
                                </Text>
                                <TouchableOpacity
                                    testID={`feedPostCommentsClose-${post.id}`}
                                    accessibilityLabel="feedPostCommentsClose"
                                    onPress={() => setCommentsOpen(false)}
                                >
                                    <Image
                                        source={
                                            imageAssets?.[
                                                feedConfig?.hasDarkBackground
                                                    ? FastCommentsImageAsset.ICON_CROSS_WHITE
                                                    : FastCommentsImageAsset.ICON_CROSS
                                            ]
                                        }
                                        style={f?.commentsModalCloseIcon}
                                    />
                                </TouchableOpacity>
                            </View>
                            {commentsOpen ? (
                                <FastCommentsLiveCommenting config={commentsConfig} styles={styles} callbacks={callbacks} />
                            ) : null}
                        </View>
                    </View>
                </Modal>
            ) : null}
        </View>
    );
}

/**
 * Wrapped in `memo` so a state mutation that re-renders the parent feed
 * (reaction tick, stats merge, banner counter) doesn't re-render every row.
 */
export const FeedPostRow = memo(FeedPostRowImpl);
