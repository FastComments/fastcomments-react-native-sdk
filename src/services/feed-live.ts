/**
 * Feed-side wiring for live WebSocket events. The transport itself
 * (`subscribeToChanges` + `handleLiveEvent` in `live.ts`) is already
 * shared with the comments path; the per-instance broadcastId filter on
 * the store keeps two SDK instances in the same JS process from
 * suppressing each other's events.
 *
 * `loadFeedPosts` calls `persistSubscriberState` directly when the head
 * response carries the routing fields, so this module currently only
 * exposes lifecycle helpers. Kept as a sibling of `live.ts` so the
 * Android-parity import path is stable for follow-up features
 * (reactions, typed feed-event callbacks).
 */
import type { FastCommentsStore } from '../store/types';
import { cleanupSubscriber } from './live';

export function teardownFeedLive(store: FastCommentsStore) {
    cleanupSubscriber(store.getState().instanceId);
}
