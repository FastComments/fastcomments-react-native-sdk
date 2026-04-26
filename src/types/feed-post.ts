/**
 * Feed post shapes used by the React Native SDK Feed feature. Mirrors the
 * `FeedPost` / `CreateFeedPostParams` from the OpenAPI client (kept narrow
 * because the RN MVP only consumes a subset of fields).
 */

export interface FeedPostMediaItemAsset {
    w: number;
    h: number;
    src: string;
}

export interface FeedPostMediaItem {
    title?: string;
    linkUrl?: string;
    sizes: FeedPostMediaItemAsset[];
}

export interface FeedPost {
    id: string;
    tenantId: string;
    title?: string;
    fromUserId?: string;
    fromUserDisplayName?: string | null;
    fromUserAvatar?: string | null;
    tags?: string[];
    contentHTML?: string;
    createdAt: string | number | Date;
    reacts?: Record<string, number>;
    commentCount?: number | null;
    media?: FeedPostMediaItem[];
}

export interface CreateFeedPostParams {
    title?: string;
    contentHTML?: string;
    fromUserId?: string;
    fromUserDisplayName?: string;
    tags?: string[];
    meta?: Record<string, string>;
    media?: FeedPostMediaItem[];
}
