/**
 * Feed reaction wrapper. The PublicApi binding `reactFeedPostPublic` is
 * route-level shared with the web frontend; we hand-roll the HTTP call here
 * because the SDK service layer (see `services/feed.ts`) routes everything
 * through `makeRequest` for SSO + `apiHost` consistency.
 *
 * Optimistic flow:
 *   1. Mutate the store immediately (count delta + myReacts membership).
 *   2. POST to the server with `isUndo` flipped accordingly.
 *   3. On non-success status, revert the local mutation and surface a
 *      translated error via the supplied error handler.
 */
import type { FastCommentsStore } from '../store/types';
import { CommonHTTPResponse, createURLQueryString, makeRequest } from './http';
import { newBroadcastId } from './broadcast-id';

export interface ReactFeedPostResponse extends CommonHTTPResponse {
    reactType?: string;
    isUndo?: boolean;
}

export type FeedReactionResult = { ok: true; isUndo: boolean } | { error: string };

/**
 * Toggle a reaction on a feed post. The caller decides if this is an add
 * (`isUndo=false`) or remove (`isUndo=true`); the chip strip computes that
 * from the current `myReacts` map. Returns the resolved `isUndo` so callers
 * can re-render the chip's pressed state from the authoritative outcome.
 */
export async function reactToFeedPost(
    store: FastCommentsStore,
    postId: string,
    reactType: string,
    isUndo: boolean
): Promise<FeedReactionResult> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return { error: 'no-tenant-id' };
    if (!postId) return { error: 'no-post-id' };

    const existing = state.feedPostsById[postId];
    const prevReacts = existing?.reacts;
    const prevMyReacts = existing?.myReacts;
    const delta = isUndo ? -1 : 1;
    const myReactsValue = !isUndo;

    state.applyFeedPostReactDelta(postId, reactType, delta, myReactsValue);

    const broadcastId = newBroadcastId(store);
    const queryParams: Record<string, string | number | boolean | undefined> = {
        broadcastId,
        isUndo: isUndo ? true : undefined,
        // Server reads `req.query.urlId` to populate `sessionDetails.urlId`,
        // which is then used as the pubsub channel for the reaction event.
        // The feed list/create/delete endpoints route their broadcasts via
        // the literal 'FEEDS' channel, so we mirror that here so the live
        // `fr` / `dfr` events land on the same channel A is subscribed to.
        urlId: 'FEEDS',
    };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    try {
        const response = await makeRequest<ReactFeedPostResponse>({
            apiHost: state.apiHost,
            method: 'POST',
            url:
                '/feed-posts/' +
                encodeURIComponent(tenantId) +
                '/react/' +
                encodeURIComponent(postId) +
                createURLQueryString(queryParams),
            body: { reactType },
        });
        if (response.status !== 'success') {
            store.getState().setFeedPostReacts(postId, prevReacts, prevMyReacts);
            return { error: response.code ?? response.reason ?? 'react-failed' };
        }
        return { ok: true, isUndo: response.isUndo ?? isUndo };
    } catch (e) {
        store.getState().setFeedPostReacts(postId, prevReacts, prevMyReacts);
        return { error: (e as Error).message };
    }
}
