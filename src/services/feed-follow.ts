import type { FastCommentsStore } from '../store/types';
import { CommonHTTPResponse, createURLQueryString, makeRequest } from './http';
import { newBroadcastId } from './broadcast-id';

/**
 * Toggle follow state for a feed-post author. The follow endpoint isn't in the
 * typed `fastcomments-sdk` client yet, so we hit `/users/{userId}/follow`
 * directly via `makeRequest`. On any non-success status (auth fail, ban,
 * rate-limit, blocked relationship) or network error we revert the optimistic
 * flip so the store reflects what the server actually accepted.
 */
export interface FollowResponse extends CommonHTTPResponse {}

export type FollowResult =
    | { ok: true; following: boolean }
    | { error: string; following: boolean };

export async function setFollowState(
    store: FastCommentsStore,
    targetUserId: string,
    desiredFollowing: boolean
): Promise<FollowResult> {
    const state = store.getState();
    const previouslyFollowing = state.followingUserIds.has(targetUserId);

    state.setFollowPending(targetUserId, true);
    state.setFollowingUser(targetUserId, desiredFollowing);

    const broadcastId = newBroadcastId(store);
    const queryParams: Record<string, string | number | undefined> = { broadcastId };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    const method = desiredFollowing ? 'POST' : 'DELETE';
    const url = '/users/' + encodeURIComponent(targetUserId) + '/follow' + createURLQueryString(queryParams);

    function revert(reason: string): FollowResult {
        store.getState().setFollowingUser(targetUserId, previouslyFollowing);
        store.getState().setFollowPending(targetUserId, false);
        return { error: reason, following: previouslyFollowing };
    }

    try {
        const response = await makeRequest<FollowResponse>({
            apiHost: state.apiHost,
            method,
            url,
        });
        if (response.status !== 'success') {
            return revert(response.code || response.reason || 'follow-rejected');
        }
        store.getState().setFollowPending(targetUserId, false);
        return { ok: true, following: desiredFollowing };
    } catch (e) {
        return revert((e as Error).message);
    }
}
