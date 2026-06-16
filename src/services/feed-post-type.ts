import type { FeedPost } from '../types/feed-post';

/** The feed post layout kinds, mirroring the Android SDK's `FeedPostType`. */
export type FeedPostType = 'TEXT_ONLY' | 'SINGLE_IMAGE' | 'MULTI_IMAGE' | 'TASK';

/**
 * Pick the layout for a post from its media + links, like Android's
 * `FeedPostsAdapter`: a links-only post is a TASK (action buttons), otherwise
 * the image count drives TEXT_ONLY / SINGLE_IMAGE / MULTI_IMAGE.
 */
export function getFeedPostType(post: Pick<FeedPost, 'media' | 'links'>): FeedPostType {
    const mediaCount = post.media?.length ?? 0;
    const hasLinks = !!post.links && post.links.length > 0;
    if (mediaCount === 0 && hasLinks) return 'TASK';
    if (mediaCount === 0) return 'TEXT_ONLY';
    if (mediaCount === 1) return 'SINGLE_IMAGE';
    return 'MULTI_IMAGE';
}
