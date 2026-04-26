import { createUUID } from './uuid';
import type { FastCommentsStore } from '../store/types';

/**
 * Generate a fresh broadcast id and remember it on the supplied store. The
 * live-event handler later filters incoming events whose broadcastId is in
 * the store's `broadcastIdsSent` set, suppressing the echo of writes that
 * THIS store originated.
 *
 * Historically this lived in a module-level array, which broke when more than
 * one SDK instance ran in the same JS process (e.g. multi-tenant dashboards
 * or test harnesses) - one user's writes would suppress the other user's
 * live events. Scoping to the store fixes that.
 */
export function newBroadcastId(store: FastCommentsStore): string {
    const id = createUUID();
    store.getState().rememberBroadcastId(id);
    return id;
}
