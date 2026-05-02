import { memo } from 'react';
import { Text, View } from 'react-native';
import type { FeedPost } from '../types/feed-post';
import type { FeedCustomToolbarButton } from '../types/feed-custom-toolbar-button';
import type { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import type { FastCommentsSessionUser } from '../types/user';
import type { FollowStateProvider } from '../types/follow-state-provider';
import { getPrettyDate } from '../services/pretty-date';
import { FeedCustomToolbarButtonView } from './feed-custom-toolbar-button';
import { FeedFollowPill } from './feed-follow-pill';
import { FeedPostMediaGallery } from './feed-post-media-gallery';
import { FeedPostReactions } from './feed-post-reactions';

export interface FeedPostRowProps {
    post: FeedPost;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    customToolbarButtons?: FeedCustomToolbarButton[];
    /**
     * Store reference. Required for reactions; if absent the reactions strip
     * is suppressed.
     */
    store?: FastCommentsStore;
    /**
     * Viewer user id. When undefined or equal to the post's author id the
     * follow pill is suppressed.
     */
    currentUser?: FastCommentsSessionUser;
    /**
     * Host-supplied follow state. When absent, no follow pill is rendered.
     */
    followStateProvider?: FollowStateProvider;
    /**
     * Bumped by the parent feed when host follow state has changed externally
     * so the pill rebinds via {@link FollowStateProvider#isFollowing}.
     */
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
    // Strip tags first, then decode entities. Decoding first would turn
    // attacker-encoded `&lt;script&gt;` into real `<script>` tags before the
    // strip ran. Output goes only into a `<Text>`, but ordering should not
    // depend on that being the only consumer.
    return decodeEntities(input.replace(/<[^>]*>/g, '')).trim();
}

function toEpoch(value: FeedPost['createdAt']): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Date.parse(value) || Date.now();
    if (value instanceof Date) return value.getTime();
    return Date.now();
}

function FeedPostRowImpl({ post, translations, styles, customToolbarButtons, store, currentUser, followStateProvider, followStateRevision }: FeedPostRowProps) {
    const author = post.fromUserDisplayName ?? '';
    const content = stripHtml(post.contentHTML);
    const ts = toEpoch(post.createdAt);
    const date = getPrettyDate(translations, ts);
    const visibleButtons = (customToolbarButtons ?? []).filter(
        (button) => !button.visible || button.visible(post)
    );
    const viewerId = getCurrentUserId(currentUser);
    const showFollowPill =
        !!followStateProvider &&
        !!post.fromUserId &&
        !!viewerId &&
        post.fromUserId !== viewerId;
    return (
        <View
            testID={`feedPostRow-${post.id}`}
            accessibilityLabel={`feedPostRow-${post.id}`}
            style={styles.feed?.post}
        >
            <View style={styles.feed?.postHeader}>
                {author ? <Text style={styles.feed?.postAuthor}>{author}</Text> : null}
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
            </View>
            {post.title ? <Text style={styles.feed?.postTitle}>{post.title}</Text> : null}
            {content ? <Text style={styles.feed?.postContent}>{content}</Text> : null}
            {post.media && post.media.length > 0 ? (
                <FeedPostMediaGallery postId={post.id} media={post.media} styles={styles} />
            ) : null}
            {date ? <Text style={styles.feed?.postDate}>{date}</Text> : null}
            {store ? (
                <FeedPostReactions
                    post={post}
                    store={store}
                    translations={translations}
                    styles={styles}
                />
            ) : null}
            {visibleButtons.length > 0 ? (
                <View
                    testID={`feedCustomToolbar-${post.id}`}
                    accessibilityLabel={`feedCustomToolbar-${post.id}`}
                    style={styles.feed?.customToolbar}
                >
                    {visibleButtons.map((button) => (
                        <FeedCustomToolbarButtonView
                            key={button.id}
                            button={button}
                            post={post}
                            styles={styles}
                        />
                    ))}
                </View>
            ) : null}
        </View>
    );
}

/**
 * Wrapped in `memo` so a state mutation that re-renders the parent feed
 * (reaction tick, stats merge, banner counter) doesn't re-render every row.
 * Inputs are referentially stable: each `post` is replaced in `feedPostsById`
 * only when its own fields change, and `translations`/`styles`/`store`/etc.
 * are stable across renders.
 */
export const FeedPostRow = memo(FeedPostRowImpl);
