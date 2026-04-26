import { Text, View } from 'react-native';
import type { FeedPost } from '../types/feed-post';
import type { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import type { FastCommentsSessionUser } from '../types/user';
import { getPrettyDate } from '../services/pretty-date';
import { FeedFollowPill } from './feed-follow-pill';

export interface FeedPostRowProps {
    post: FeedPost;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    /**
     * Optional store reference. When omitted (e.g. legacy or read-only
     * mounting paths) the follow pill simply isn't rendered.
     */
    store?: FastCommentsStore;
    /**
     * The viewer's user id. Pulled from the store by the parent feed; passing
     * it explicitly keeps this row pure for tests. When undefined or equal to
     * the post's author id, the follow pill is suppressed (you can't follow
     * yourself, and the pill is hidden for anonymous viewers).
     */
    currentUser?: FastCommentsSessionUser;
}

function getCurrentUserId(user: FastCommentsSessionUser): string | undefined {
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
    // The SDK's MVP feed does not render HTML; the row shows plain text. The
    // full Android Feed adapter renders rich content; we intentionally keep
    // this minimal. Decode entities first because the server returns HTML
    // double-escaped (`&lt;p&gt;...`) on this endpoint.
    return decodeEntities(input).replace(/<[^>]*>/g, '').trim();
}

function toEpoch(value: FeedPost['createdAt']): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Date.parse(value) || Date.now();
    if (value instanceof Date) return value.getTime();
    return Date.now();
}

export function FeedPostRow({ post, translations, styles, store, currentUser }: FeedPostRowProps) {
    const author = post.fromUserDisplayName ?? '';
    const content = stripHtml(post.contentHTML);
    const ts = toEpoch(post.createdAt);
    const date = getPrettyDate(translations, ts);
    const viewerId = getCurrentUserId(currentUser);
    const showFollowPill =
        !!store &&
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
                {showFollowPill && store !== undefined && post.fromUserId !== undefined ? (
                    <FeedFollowPill
                        store={store}
                        postId={post.id}
                        targetUserId={post.fromUserId}
                        translations={translations}
                        styles={styles}
                    />
                ) : null}
            </View>
            {post.title ? <Text style={styles.feed?.postTitle}>{post.title}</Text> : null}
            {content ? <Text style={styles.feed?.postContent}>{content}</Text> : null}
            {date ? <Text style={styles.feed?.postDate}>{date}</Text> : null}
        </View>
    );
}
