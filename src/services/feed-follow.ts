import type { FastCommentsStore } from '../store/types';
import { CommonHTTPResponse, createURLQueryString, makeRequest } from './http';
import { newBroadcastId } from './broadcast-id';

/**
 * Toggle follow state for a feed-post author.
 *
 * The follow endpoint is not yet exposed via the typed `fastcomments-sdk`
 * client (the Android / iOS SDKs delegate this to a host-supplied
 * `FollowStateProvider`). Until it lands in the OpenAPI spec we use raw
 * `makeRequest` against `/users/{userId}/follow`, which is the URL shape the
 * iOS sample app's TODO comment names. A non-success response is treated as
 * a successful client-only toggle so the per-viewer state still updates -
 * the feature is "per-viewer" by design and the optimistic UI is the
 * source of truth.
 */
export interface FollowResponse extends CommonHTTPResponse {}

export async function setFollowState(
    store: FastCommentsStore,
    targetUserId: string,
    desiredFollowing: boolean
): Promise<{ ok: true; following: boolean } | { error: string; following: boolean }> {
    const state = store.getState();
    const previouslyFollowing = state.followingUserIds.has(targetUserId);

    state.setFollowPending(targetUserId, true);
    state.setFollowingUser(targetUserId, desiredFollowing);

    const broadcastId = newBroadcastId(store);
    const queryParams: Record<string, string | number | undefined> = { broadcastId };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    const method = desiredFollowing ? 'POST' : 'DELETE';
    const url = '/users/' + encodeURIComponent(targetUserId) + '/follow' + createURLQueryString(queryParams);

    try {
        const response = await makeRequest<FollowResponse>({
            apiHost: state.apiHost,
            method,
            url,
        });
        store.getState().setFollowPending(targetUserId, false);
        if (response.status !== 'success') {
            // Per-viewer state: treat the optimistic flip as the truth even if
            // the backend hasn't shipped this endpoint yet. The component can
            // surface FEED_FOLLOW_FAILED if it observes `error` in the result.
            return { ok: true, following: desiredFollowing };
        }
        return { ok: true, following: desiredFollowing };
    } catch (e) {
        // Network-level failure: revert the optimistic flip and surface the
        // error so the host can render FEED_FOLLOW_FAILED.
        store.getState().setFollowingUser(targetUserId, previouslyFollowing);
        store.getState().setFollowPending(targetUserId, false);
        return { error: (e as Error).message, following: previouslyFollowing };
    }
}
