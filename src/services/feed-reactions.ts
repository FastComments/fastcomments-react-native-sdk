/**
 * Feed reaction wrapper. Optimistic flow:
 *   1. Mutate the store immediately (count delta + myReacts membership).
 *   2. POST to the server with `isUndo` flipped accordingly.
 *   3. On non-success status, revert the local mutation and surface a
 *      translated error via the supplied error handler.
 */
import type { FastCommentsStore } from '../store/types';
import type { ReactBodyParams } from 'fastcomments-sdk';
import { newBroadcastId } from './broadcast-id';

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
    const reactBody: ReactBodyParams = { reactType };
    const sdk = state.sdk;

    try {
        const response = await sdk.publicApi.reactFeedPostPublic({
            tenantId,
            postId,
            reactBodyParams: reactBody,
            isUndo: isUndo ? true : undefined,
            broadcastId,
            sso: state.ssoConfigString,
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
