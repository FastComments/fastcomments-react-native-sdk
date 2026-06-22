import type { FastCommentsStore } from '../store/types';
import type { OnlineUser } from '../types/fastcomments-state';
import { ensureTranslationComponentLoaded } from './translations';

export interface LoadOnlineUsersResult {
    nextAfterUserId: string | null;
    nextAfterName: string | null;
}

/** The page-user shape returned by getOnlineUsers / getUsersInfo. */
interface PageUserEntryLike {
    id: string;
    displayName: string;
    avatarSrc?: string | null;
    isPrivate?: boolean;
}

// Presence frames tag anonymous users with an `anon:` id prefix; named users
// carry their real userId. Match the web widget's online-users extension.
const ANON_PREFIX = 'anon:';
// Coalesce a burst of joins into one getUsersInfo call (matches the web widget).
const ENRICH_DEBOUNCE_MS = 500;

/**
 * Map a server page-user to a store OnlineUser. Private profiles are flagged
 * (not labeled) here so the PRIVATE_PROFILE label is resolved at render time -
 * that keeps mapping independent of whether translations have loaded yet.
 */
function toOnlineUser(entry: PageUserEntryLike): OnlineUser {
    if (entry.isPrivate) {
        return { id: entry.id, displayName: '', avatarSrc: undefined, isPrivate: true };
    }
    return { id: entry.id, displayName: entry.displayName, avatarSrc: entry.avatarSrc ?? undefined };
}

/**
 * Load the page's online users (avatar + name) into the store for the live-chat
 * facepile / user list, via the same `getOnlineUsers` endpoint the web widget
 * uses. This is the initial snapshot + pagination; steady-state churn is applied
 * incrementally via applyOnlineUsersPresenceUpdate (no full re-fetch per change).
 * Pass `append` + the previous `nextAfter*` cursor to page through the list.
 */
export async function loadOnlineUsers(
    store: FastCommentsStore,
    opts?: { afterUserId?: string; afterName?: string; append?: boolean }
): Promise<LoadOnlineUsersResult | null> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    const urlId = state.config.urlId;
    if (!tenantId || !urlId) return null;
    try {
        const response = await state.sdk.publicApi.getOnlineUsers({
            tenantId,
            urlId,
            afterUserId: opts?.afterUserId,
            afterName: opts?.afterName,
        });
        if (response.status !== 'success') return null;
        const latest = store.getState();
        const mapped: OnlineUser[] = (response.users || []).map((u) => toOnlineUser(u));
        const users = opts?.append ? [...latest.onlineUsers, ...mapped] : mapped;
        latest.setOnlineUsers(users, response.totalCount ?? users.length, response.anonCount ?? 0);
        return {
            nextAfterUserId: response.nextAfterUserId ?? null,
            nextAfterName: response.nextAfterName ?? null,
        };
    } catch (e) {
        console.error('Failed to load online users', e);
        return null;
    }
}

export interface LoadOfflineUsersResult {
    users: OnlineUser[];
    nextAfterUserId: string | null;
    nextAfterName: string | null;
}

/**
 * Load a page of the page's OFFLINE users (avatar + name), via the same
 * getOfflineUsers endpoint the web widget's online-users panel uses for its
 * "Offline" section. Offline users aren't presence-driven, so callers hold the
 * accumulated list themselves and page with the returned nextAfter* cursor.
 */
export async function loadOfflineUsers(
    store: FastCommentsStore,
    opts?: { afterUserId?: string; afterName?: string }
): Promise<LoadOfflineUsersResult | null> {
    const state = store.getState();
    const tenantId = state.config.tenantId;
    const urlId = state.config.urlId;
    if (!tenantId || !urlId) return null;
    try {
        const response = await state.sdk.publicApi.getOfflineUsers({
            tenantId,
            urlId,
            afterUserId: opts?.afterUserId,
            afterName: opts?.afterName,
        });
        if (response.status !== 'success') return null;
        const latest = store.getState();
        return {
            users: (response.users || []).map((u) => toOnlineUser(u)),
            nextAfterUserId: response.nextAfterUserId ?? null,
            nextAfterName: response.nextAfterName ?? null,
        };
    } catch (e) {
        console.error('Failed to load offline users', e);
        return null;
    }
}

// The section labels ("Online"/"Offline"/"Load more") and the private-profile
// placeholder live in the comment-ui-online-users namespace, which the comments
// payload doesn't carry, so load it on demand and merge it in.
function ensureOnlineUsersTranslations(store: FastCommentsStore): Promise<void> {
    return ensureTranslationComponentLoaded(store, 'comment-ui-online-users');
}

// Ensure the initial online-users snapshot is loaded exactly once per store,
// no matter how many online-users widgets mount (the in-header facepile and a
// standalone side list can both call this; only the first actually fetches).
const initialLoadRequested = new WeakSet<FastCommentsStore>();
export function ensureOnlineUsersLoaded(store: FastCommentsStore): void {
    if (initialLoadRequested.has(store)) return;
    initialLoadRequested.add(store);
    // Labels and the user snapshot are independent (private users are flagged,
    // not labeled, at map time), so fetch them in parallel. The labels are always
    // needed; the snapshot only when nobody (header, presence, tests) has it yet.
    void ensureOnlineUsersTranslations(store);
    if (store.getState().onlineUsers.length === 0) {
        void loadOnlineUsers(store);
    }
}

// Per-store enrich queue: a burst of joins is coalesced into one getUsersInfo
// call. Scoped per store (WeakMap) so multiple widgets on a page don't collide.
interface EnrichState {
    pending: Set<string>;
    timer: ReturnType<typeof setTimeout> | null;
}
const enrichByStore = new WeakMap<FastCommentsStore, EnrichState>();

function enrichStateFor(store: FastCommentsStore): EnrichState {
    let s = enrichByStore.get(store);
    if (!s) {
        s = { pending: new Set(), timer: null };
        enrichByStore.set(store, s);
    }
    return s;
}

function scheduleEnrich(store: FastCommentsStore, id: string) {
    const s = enrichStateFor(store);
    s.pending.add(id);
    if (s.timer) return;
    s.timer = setTimeout(() => {
        s.timer = null;
        void flushEnrich(store);
    }, ENRICH_DEBOUNCE_MS);
}

async function flushEnrich(store: FastCommentsStore) {
    const s = enrichStateFor(store);
    const ids = [...s.pending];
    s.pending.clear();
    if (ids.length === 0) return;
    const state = store.getState();
    const tenantId = state.config.tenantId;
    if (!tenantId) return;
    try {
        const response = await state.sdk.publicApi.getUsersInfo({ tenantId, ids: ids.join(',') });
        if (response.status !== 'success' || !response.users) return;
        const latest = store.getState();
        // Only merge users still online (some may have left during the request);
        // upsertOnlineUsers itself also refuses to add ids that aren't present.
        const onlineIds = new Set(latest.onlineUsers.map((u) => u.id));
        const enriched = response.users
            .filter((u) => onlineIds.has(u.id))
            .map((u) => toOnlineUser(u));
        if (enriched.length > 0) latest.upsertOnlineUsers(enriched);
    } catch {
        // Swallow - presence events keep the list roughly correct regardless.
    }
}

/**
 * Apply a websocket presence frame (`p-u`) to the online-users list atomically:
 * drop users who left, add placeholder rows for named users who joined (then
 * enrich their name/avatar via a single debounced getUsersInfo), and adjust the
 * anonymous + total counts. No full list re-fetch per change.
 */
export function applyOnlineUsersPresenceUpdate(
    store: FastCommentsStore,
    frame: { uj?: string[]; ul?: string[]; sc?: number }
) {
    const joinedNamed: string[] = [];
    const leftNamed: string[] = [];
    let anonDelta = 0;
    for (const id of frame.uj || []) {
        if (id.startsWith(ANON_PREFIX)) anonDelta++;
        else joinedNamed.push(id);
    }
    for (const id of frame.ul || []) {
        if (id.startsWith(ANON_PREFIX)) anonDelta--;
        else leftNamed.push(id);
    }
    if (joinedNamed.length === 0 && leftNamed.length === 0 && anonDelta === 0 && typeof frame.sc !== 'number') {
        return;
    }
    store.getState().applyOnlineUsersPresence({
        joinedNamed,
        leftNamed,
        anonDelta,
        totalCount: typeof frame.sc === 'number' ? Math.max(frame.sc, 1) : undefined,
    });
    // A user who just left no longer needs enriching; new joins do.
    if (leftNamed.length > 0) {
        const s = enrichStateFor(store);
        for (const id of leftNamed) s.pending.delete(id);
    }
    for (const id of joinedNamed) scheduleEnrich(store, id);
}
