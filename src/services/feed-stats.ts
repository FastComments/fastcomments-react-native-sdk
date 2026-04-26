/**
 * Periodic stats refresh for the Feed view. Mirrors the Android
 * `FastCommentsFeedView` polling loop (30s tick, GET /feed-posts/{tenantId}/stats,
 * merge `commentCount` + `reacts` into the existing posts cache).
 *
 * The transport is the same `makeRequest` helper used elsewhere in the SDK so
 * we don't pull a second HTTP path. Loop ownership lives on the store slice
 * (`feedStatsTimerId`) so multiple SDK instances in the same JS process
 * (typical in tests / multi-tenant dashboards) don't clobber each other.
 */
import type { FastCommentsStore } from '../store/types';
import type { FeedPostStatsPatch } from '../store/types';
import { CommonHTTPResponse, createURLQueryString, makeRequest } from './http';

const DEFAULT_INTERVAL_MS = 30000;

interface WireStats {
    commentCount?: number | null;
    reacts?: Record<string, number>;
}

export interface GetFeedPostsStatsResponse extends CommonHTTPResponse {
    stats?: Record<string, WireStats>;
}

/**
 * One-shot fetch + merge. Skips when there are no posts loaded, the WS is
 * down, or the tenant id is missing. Errors are swallowed; the next tick will
 * try again.
 */
export async function refreshFeedStatsOnce(store: FastCommentsStore): Promise<void> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return;
    if (!state.wsConnected) return;
    const ids = state.feedPostOrder;
    if (ids.length === 0) return;

    const queryParams: Record<string, string | string[] | number | undefined> = {
        postIds: ids,
    };
    if (state.ssoConfigString) queryParams.sso = state.ssoConfigString;

    try {
        const response = await makeRequest<GetFeedPostsStatsResponse>({
            apiHost: state.apiHost,
            method: 'GET',
            url:
                '/feed-posts/' +
                encodeURIComponent(tenantId) +
                '/stats' +
                createURLQueryString(queryParams),
        });
        if (response.status !== 'success' || !response.stats) return;
        const patch: Record<string, FeedPostStatsPatch> = {};
        for (const id in response.stats) {
            const s = response.stats[id];
            patch[id] = {
                commentCount: s.commentCount ?? undefined,
                reacts: s.reacts,
            };
        }
        store.getState().mergeFeedPostStats(patch);
    } catch (e) {
        // Silent: next tick will retry.
    }
}

/**
 * Begin the polling loop. If a previous timer is active it is cancelled first
 * so this is idempotent. Default cadence is 30s; tests pass a smaller value
 * via `intervalMs` to keep run-time short.
 */
export function startFeedStatsPoll(
    store: FastCommentsStore,
    intervalMs: number = DEFAULT_INTERVAL_MS
): void {
    stopFeedStatsPoll(store);
    const id = setInterval(() => {
        void refreshFeedStatsOnce(store);
    }, intervalMs);
    store.getState().setFeedStatsTimerId(id);
}

export function stopFeedStatsPoll(store: FastCommentsStore): void {
    const state = store.getState();
    const id = state.feedStatsTimerId;
    if (id !== undefined) {
        clearInterval(id);
        state.setFeedStatsTimerId(undefined);
    }
}
