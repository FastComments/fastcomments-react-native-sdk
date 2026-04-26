import type { FastCommentsStore } from '../store/types';
import type {
    FeedPost,
    CreateFeedPostParams,
    FeedPostMediaItem,
    FeedPostMediaItemAsset,
} from '../types/feed-post';
import { CommonHTTPResponse, createURLQueryString, makeRequest } from './http';
import { newBroadcastId } from './broadcast-id';
import { persistSubscriberState } from './live';

/**
 * Wire-format feed post: the backend sends MongoDB-style `_id`. We normalize
 * to `id` at the service boundary so all consumers (store, components, the
 * live-event handler) work with the OpenAPI shape.
 */
interface WireFeedPost extends Omit<FeedPost, 'id'> {
    _id?: string;
    id?: string;
}

export interface GetFeedPostsResponse extends CommonHTTPResponse {
    feedPosts?: WireFeedPost[];
    urlIdWS?: string;
    userIdWS?: string;
    tenantIdWS?: string;
    user?: { id?: string } | null;
}

export interface CreateFeedPostResponse extends CommonHTTPResponse {
    feedPost?: WireFeedPost;
}

export interface DeleteFeedPostResponse extends CommonHTTPResponse {}

function normalize(post: WireFeedPost): FeedPost | undefined {
    const id = post.id ?? post._id;
    if (!id) return undefined;
    return {
        id,
        tenantId: post.tenantId,
        title: post.title,
        fromUserId: post.fromUserId,
        fromUserDisplayName: post.fromUserDisplayName,
        fromUserAvatar: post.fromUserAvatar,
        tags: post.tags,
        contentHTML: post.contentHTML,
        createdAt: post.createdAt,
        reacts: post.reacts,
        commentCount: post.commentCount,
        media: post.media,
    };
}

function normalizeMany(posts: WireFeedPost[] | undefined): FeedPost[] {
    if (!posts) return [];
    const out: FeedPost[] = [];
    for (const p of posts) {
        const n = normalize(p);
        if (n) out.push(n);
    }
    return out;
}

interface FetchOptions {
    /** Pagination cursor (last loaded post id). When undefined, fetches the head. */
    afterId?: string;
    /** Page size. Defaults to 30. */
    limit?: number;
    /** Optional tag filter. */
    tags?: string[];
}

/**
 * Loads a page of feed posts. On the FIRST page (no `afterId`) we replace the
 * store; subsequent pages append. Also wires the WebSocket subscriber when the
 * server returns ws routing fields.
 */
export async function loadFeedPosts(
    store: FastCommentsStore,
    options: FetchOptions = {}
): Promise<{ posts: FeedPost[] } | { error: string }> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) {
        store.getState().setFeedLoadFailed(true);
        return { error: 'no-tenant-id' };
    }
    const queryParams: Record<string, string | number | undefined> = {
        afterId: options.afterId,
        limit: options.limit ?? state.PAGE_SIZE,
        // includeUserInfo is only set on the head request so the server can build
        // the WebSocket routing identifiers (urlIdWS/tenantIdWS/userIdWS).
        includeUserInfo: !options.afterId ? 1 : undefined,
    };
    if (options.tags && options.tags.length > 0) {
        queryParams.tags = options.tags.join(',');
    }
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    try {
        const response = await makeRequest<GetFeedPostsResponse>({
            apiHost: state.apiHost,
            method: 'GET',
            url: '/feed-posts/' + encodeURIComponent(tenantId) + createURLQueryString(queryParams),
        });

        if (response.status !== 'success') {
            store.getState().setFeedLoadFailed(true);
            return { error: response.code ?? response.reason ?? 'load-failed' };
        }

        const posts = normalizeMany(response.feedPosts);
        const isHeadLoad = !options.afterId;
        const fresh = store.getState();
        if (isHeadLoad) {
            fresh.replaceFeedPosts(posts);
        } else {
            fresh.appendFeedPosts(posts);
        }
        fresh.setFeedHasMore(posts.length >= (queryParams.limit as number));
        fresh.setFeedLoadFailed(false);

        if (response.urlIdWS && response.tenantIdWS && response.userIdWS) {
            persistSubscriberState(store, response.urlIdWS, response.tenantIdWS, response.userIdWS);
        }

        return { posts };
    } catch (e) {
        store.getState().setFeedLoadFailed(true);
        return { error: (e as Error).message };
    }
}

export async function createFeedPost(
    store: FastCommentsStore,
    params: CreateFeedPostParams
): Promise<{ post: FeedPost } | { error: string }> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return { error: 'no-tenant-id' };
    const broadcastId = newBroadcastId(store);
    const queryParams: Record<string, string | number | undefined> = { broadcastId };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    try {
        const response = await makeRequest<CreateFeedPostResponse>({
            apiHost: state.apiHost,
            method: 'POST',
            url:
                '/feed-posts/' +
                encodeURIComponent(tenantId) +
                createURLQueryString(queryParams),
            body: params,
        });
        if (response.status !== 'success' || !response.feedPost) {
            return { error: response.code ?? response.reason ?? 'create-failed' };
        }
        const created = normalize(response.feedPost);
        if (!created) return { error: 'no-id' };
        // Locally insert at head; the live event echo will be filtered by
        // broadcastId so we don't double-insert.
        store.getState().prependFeedPost(created);
        return { post: created };
    } catch (e) {
        return { error: (e as Error).message };
    }
}

interface UploadImageWireResponse {
    status: 'success' | 'failed';
    url?: string;
    media?: FeedPostMediaItemAsset[];
    code?: string;
    reason?: string;
}

export interface UploadFeedMediaProgress {
    (loaded: number, total: number): void;
}

/**
 * Uploads a single image (file path or remote URL) to the existing
 * `/upload-image/{tenantId}` endpoint with `sizePreset=CrossPlatform` and
 * returns a `FeedPostMediaItem` ready to attach to a feed post. If the input
 * already starts with `http`, we wrap it as a single-asset media item without
 * uploading (matches the Android `addImageUri` remote shortcut).
 */
export async function uploadFeedMediaItem(
    store: FastCommentsStore,
    fileOrUrl: string,
    onProgress?: UploadFeedMediaProgress
): Promise<{ item: FeedPostMediaItem } | { error: string }> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return { error: 'no-tenant-id' };

    if (fileOrUrl.startsWith('http')) {
        const item: FeedPostMediaItem = {
            sizes: [{ src: fileOrUrl, w: 400, h: 300 }],
        };
        return { item };
    }

    return new Promise((resolve) => {
        try {
            const formData = new FormData();
            formData.append('file', fileOrUrl);
            const xhr = new XMLHttpRequest();
            xhr.open(
                'POST',
                state.apiHost + '/upload-image/' + encodeURIComponent(tenantId) + '?sizePreset=CrossPlatform&urlId=FEEDS'
            );
            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable && onProgress) onProgress(ev.loaded, ev.total);
            };
            xhr.onload = () => {
                if (xhr.status !== 200) {
                    resolve({ error: xhr.response || 'upload-failed' });
                    return;
                }
                try {
                    const parsed = JSON.parse(xhr.response) as UploadImageWireResponse;
                    if (parsed.status !== 'success') {
                        resolve({ error: parsed.code ?? parsed.reason ?? 'upload-failed' });
                        return;
                    }
                    const sizes: FeedPostMediaItemAsset[] = parsed.media
                        ? parsed.media
                        : parsed.url
                          ? [{ src: parsed.url, w: 1000, h: 1000 }]
                          : [];
                    if (sizes.length === 0) {
                        resolve({ error: 'no-sizes' });
                        return;
                    }
                    resolve({ item: { sizes } });
                } catch (e) {
                    resolve({ error: (e as Error).message });
                }
            };
            xhr.onerror = () => resolve({ error: 'upload-network-error' });
            xhr.send(formData);
        } catch (e) {
            resolve({ error: (e as Error).message });
        }
    });
}

export async function deleteFeedPost(
    store: FastCommentsStore,
    postId: string
): Promise<{ ok: true } | { error: string }> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return { error: 'no-tenant-id' };
    const broadcastId = newBroadcastId(store);
    const queryParams: Record<string, string | number | undefined> = { broadcastId };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    try {
        const response = await makeRequest<DeleteFeedPostResponse>({
            apiHost: state.apiHost,
            method: 'DELETE',
            url:
                '/feed-posts/' +
                encodeURIComponent(tenantId) +
                '/' +
                encodeURIComponent(postId) +
                createURLQueryString(queryParams),
        });
        if (response.status !== 'success') {
            return { error: response.code ?? response.reason ?? 'delete-failed' };
        }
        store.getState().removeFeedPost(postId);
        return { ok: true };
    } catch (e) {
        return { error: (e as Error).message };
    }
}
