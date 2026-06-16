import type { FastCommentsStore } from '../store/types';
import type { OnlineUser } from '../types/fastcomments-state';

export interface LoadOnlineUsersResult {
    nextAfterUserId: string | null;
    nextAfterName: string | null;
}

/**
 * Load the page's online users (avatar + name) into the store for the live-chat
 * facepile / user list, via the same `getOnlineUsers` endpoint the web widget
 * uses. Pass `append` + the previous `nextAfter*` cursor to page through the list.
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
        const mapped: OnlineUser[] = (response.users || []).map((u) => ({
            id: u.id,
            displayName: u.displayName,
            avatarSrc: u.avatarSrc ?? undefined,
        }));
        const latest = store.getState();
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
