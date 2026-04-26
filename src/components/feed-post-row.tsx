import { Text, View } from 'react-native';
import type { FeedPost } from '../types/feed-post';
import type { IFastCommentsStyles } from '../types';
import { getPrettyDate } from '../services/pretty-date';

export interface FeedPostRowProps {
    post: FeedPost;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
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

export function FeedPostRow({ post, translations, styles }: FeedPostRowProps) {
    const author = post.fromUserDisplayName ?? '';
    const content = stripHtml(post.contentHTML);
    const ts = toEpoch(post.createdAt);
    const date = getPrettyDate(translations, ts);
    return (
        <View
            testID={`feedPostRow-${post.id}`}
            accessibilityLabel={`feedPostRow-${post.id}`}
            style={styles.feed?.post}
        >
            {post.title ? <Text style={styles.feed?.postTitle}>{post.title}</Text> : null}
            {author ? <Text style={styles.feed?.postAuthor}>{author}</Text> : null}
            {content ? <Text style={styles.feed?.postContent}>{content}</Text> : null}
            {date ? <Text style={styles.feed?.postDate}>{date}</Text> : null}
        </View>
    );
}
