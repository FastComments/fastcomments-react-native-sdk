import type { FastCommentsStore } from '../store/types';
import type {
    FeedPost,
    CreateFeedPostParams,
    FeedPostMediaItem,
    FeedPostMediaItemAsset,
} from '../types/feed-post';
import type { FeedPost as SDKFeedPost } from 'fastcomments-sdk';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import { newBroadcastId } from './broadcast-id';
import { persistSubscriberState } from './live';
import { addTranslationsToStore } from './translations';
import { responseError } from './api-response-extras';

/**
 * Load the feed's UI copy into the store: comment-ui (shared keys: date phrasing
 * for getPrettyDate, common errors) + feed-ui (feed-specific). allSettled so a
 * missing namespace doesn't drop the other; never throws (renders with empty
 * strings on failure). Shared by FastCommentsFeed and the standalone composer.
 */
export async function setupFeedTranslations(store: FastCommentsStore, locale?: string): Promise<void> {
    const sdk = store.getState().sdk;
    const results = await Promise.allSettled([
        sdk.publicApi.getTranslations({ namespace: 'widgets', component: 'comment-ui', useFullTranslationIds: true, locale }),
        sdk.publicApi.getTranslations({ namespace: 'widgets', component: 'feed-ui', useFullTranslationIds: true, locale }),
    ]);
    for (const r of results) {
        if (r.status === 'fulfilled' && r.value.translations) {
            addTranslationsToStore(store, r.value.translations);
        }
    }
}

/**
 * The typed SDK already maps the wire `_id` to `id` and parses `createdAt` to
 * a Date during deserialization, so we only have to graft the per-post
 * `myReacts` map (sent at the response root) onto each post before handing
 * the local store the narrower `FeedPost` shape.
 */
function toFeedPost(
    post: SDKFeedPost,
    myReacts: Record<string, boolean> | undefined
): FeedPost | undefined {
    if (!post.id) return undefined;
    return {
        id: post.id,
        tenantId: post.tenantId,
        title: post.title,
        fromUserId: post.fromUserId,
        fromUserDisplayName: post.fromUserDisplayName,
        fromUserAvatar: post.fromUserAvatar,
        tags: post.tags,
        contentHTML: post.contentHTML,
        createdAt: post.createdAt,
        reacts: post.reacts,
        myReacts,
        commentCount: post.commentCount,
        media: post.media,
        links: post.links,
    };
}

function toFeedPosts(
    posts: SDKFeedPost[] | undefined,
    myReactsByPost: { [postId: string]: { [reactType: string]: boolean } } | undefined
): FeedPost[] {
    if (!posts) return [];
    const out: FeedPost[] = [];
    for (const p of posts) {
        const pid = p.id;
        const my = pid && myReactsByPost ? myReactsByPost[pid] : undefined;
        const n = toFeedPost(p, my);
        if (n) out.push(n);
    }
    return out;
}

/** Plain-text preview of HTML content, used as a comments page title. */
function feedContentPreview(contentHTML: string | undefined): string {
    if (!contentHTML) return '';
    const text = contentHTML.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > 100 ? `${text.slice(0, 97)}…` : text;
}

/**
 * Build the comments-widget config for a single feed post. Mirrors the Android
 * SDK's `createCommentsSDKForPost`: same tenant + SSO as the feed, the urlId
 * namespaced as `post:<id>` (this is how a post's comment thread is associated),
 * and a pageTitle from the post title or a content preview.
 */
export function buildPostCommentsConfig(
    post: Pick<FeedPost, 'id' | 'title' | 'contentHTML'>,
    feedConfig: FastCommentsRNConfig
): FastCommentsRNConfig {
    return {
        ...feedConfig,
        urlId: `post:${post.id}`,
        pageTitle: post.title || feedContentPreview(post.contentHTML) || undefined,
    };
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
    const limit = options.limit ?? state.PAGE_SIZE;

    try {
        const sdk = state.sdk;
        const response = await sdk.publicApi.getFeedPostsPublic({
            tenantId,
            afterId: options.afterId,
            limit,
            tags: options.tags && options.tags.length > 0 ? options.tags : undefined,
            sso: state.ssoConfigString || undefined,
            // includeUserInfo is only set on the head request so the server can
            // build the WebSocket routing identifiers AND populate `response.user`.
            includeUserInfo: !options.afterId ? true : undefined,
        });

        if (response.status !== 'success') {
            store.getState().setFeedLoadFailed(true);
            return { error: responseError(response, 'load-failed') };
        }

        const posts = toFeedPosts(response.feedPosts, response.myReacts);
        const isHeadLoad = !options.afterId;
        const fresh = store.getState();
        if (isHeadLoad) {
            fresh.replaceFeedPosts(posts);
        } else {
            fresh.appendFeedPosts(posts);
        }
        fresh.setFeedHasMore(posts.length >= limit);
        fresh.setFeedLoadFailed(false);

        if (response.urlIdWS && response.tenantIdWS && response.userIdWS) {
            persistSubscriberState(store, response.urlIdWS, response.tenantIdWS, response.userIdWS);
        }

        // Persist the resolved viewer so per-row UI (e.g. the follow pill) can
        // skip the user's own posts. The wire `user` shape is a subset of
        // FastCommentsLoggedInUser; map only the fields we know exist.
        const respUser = response.user;
        const respUserId = respUser?.id;
        if (isHeadLoad && respUser && respUserId) {
            fresh.setCurrentUser({
                id: respUserId,
                username: respUser.username ?? '',
                email: respUser.email ?? undefined,
                displayLabel: respUser.displayLabel,
                authorized: respUser.authorized ?? true,
                avatarSrc: respUser.avatarSrc ?? null,
                hasBlockedUsers: false,
            });
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

    try {
        const sdk = state.sdk;
        const response = await sdk.publicApi.createFeedPostPublic({
            tenantId,
            broadcastId,
            sso: state.ssoConfigString || undefined,
            createFeedPostParams: {
                title: params.title,
                contentHTML: params.contentHTML,
                fromUserId: params.fromUserId,
                fromUserDisplayName: params.fromUserDisplayName,
                tags: params.tags,
                meta: params.meta,
                media: params.media,
                links: params.links,
            },
        });
        if (response.status !== 'success' || !response.feedPost) {
            return { error: responseError(response, 'create-failed') };
        }
        const created = toFeedPost(response.feedPost, undefined);
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
            const ssoQuery = state.ssoConfigString
                ? '&sso=' + encodeURIComponent(state.ssoConfigString)
                : '';
            xhr.open(
                'POST',
                state.apiHost + '/upload-image/' + encodeURIComponent(tenantId) + '?sizePreset=CrossPlatform&urlId=FEEDS' + ssoQuery
            );
            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable && onProgress) onProgress(ev.loaded, ev.total);
            };
            xhr.onload = () => {
                if (xhr.status !== 200) {
                    resolve({ error: 'upload-failed' });
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

    try {
        const sdk = state.sdk;
        const response = await sdk.publicApi.deleteFeedPostPublic({
            tenantId,
            postId,
            broadcastId,
            sso: state.ssoConfigString || undefined,
        });
        if (response.status !== 'success') {
            return { error: responseError(response, 'delete-failed') };
        }
        store.getState().removeFeedPost(postId);
        return { ok: true };
    } catch (e) {
        return { error: (e as Error).message };
    }
}
