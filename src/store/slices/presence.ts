import type { StateCreator } from 'zustand';
import type { FastCommentsStoreState, PresenceSlice } from '../types';
import { UserPresencePollStateEnum } from '../../types/fastcomments-state';

export const createPresenceSlice: StateCreator<
    FastCommentsStoreState,
    [],
    [],
    PresenceSlice
> = (set) => ({
    userPresenceState: {
        heartbeatActive: false,
        presencePollState: UserPresencePollStateEnum.Disabled,
        usersOnlineMap: {},
        userIdsToCommentIds: {},
    },
    wsConnected: false,
    subscriberCount: 0,
    onlineUsers: [],
    onlineUsersTotalCount: 0,
    onlineUsersAnonCount: 0,

    setOnlineUsers: (users, totalCount, anonCount) =>
        set({ onlineUsers: users, onlineUsersTotalCount: totalCount, onlineUsersAnonCount: anonCount }),

    // Merge enriched fields into existing entries (by id). Never adds ids - a
    // user who left mid-enrich must not reappear. Returns {} (no-op) when nothing
    // changed, so unrelated selectors aren't disturbed.
    upsertOnlineUsers: (incoming) =>
        set((state) => {
            const byId = new Map(state.onlineUsers.map((u) => [u.id, u]));
            let changed = false;
            for (const u of incoming) {
                const prev = byId.get(u.id);
                if (!prev) continue;
                if (prev.displayName !== u.displayName || prev.avatarSrc !== u.avatarSrc) {
                    byId.set(u.id, { ...prev, ...u });
                    changed = true;
                }
            }
            return changed ? { onlineUsers: [...byId.values()] } : {};
        }),

    removeOnlineUsers: (ids) =>
        set((state) => {
            if (ids.length === 0) return {};
            const drop = new Set(ids);
            const next = state.onlineUsers.filter((u) => !drop.has(u.id));
            return next.length === state.onlineUsers.length ? {} : { onlineUsers: next };
        }),

    applyOnlineUsersPresence: ({ joinedNamed, leftNamed, anonDelta, totalCount }) =>
        set((state) => {
            let users = state.onlineUsers;
            if (leftNamed.length > 0) {
                const drop = new Set(leftNamed);
                const filtered = users.filter((u) => !drop.has(u.id));
                if (filtered.length !== users.length) users = filtered;
            }
            if (joinedNamed.length > 0) {
                const existing = new Set(users.map((u) => u.id));
                // Placeholder rows (empty name) until the getUsersInfo enrich fills
                // them in, mirroring the web widget - the facepile updates at once.
                const toAdd = joinedNamed
                    .filter((id) => !existing.has(id))
                    .map((id) => ({ id, displayName: '' }));
                if (toAdd.length > 0) users = [...users, ...toAdd];
            }
            const patch: Partial<FastCommentsStoreState> = {};
            if (users !== state.onlineUsers) patch.onlineUsers = users;
            const anon = Math.max(0, state.onlineUsersAnonCount + anonDelta);
            if (anon !== state.onlineUsersAnonCount) patch.onlineUsersAnonCount = anon;
            if (totalCount !== undefined && totalCount !== state.onlineUsersTotalCount) {
                patch.onlineUsersTotalCount = totalCount;
            }
            return patch;
        }),

    setUsersOnline: (userIds, online) =>
        set((state) => {
            const usersOnlineMap = { ...state.userPresenceState.usersOnlineMap };
            if (online) {
                for (const id of userIds) usersOnlineMap[id] = true;
            } else {
                for (const id of userIds) delete usersOnlineMap[id];
            }
            return {
                userPresenceState: { ...state.userPresenceState, usersOnlineMap },
            };
        }),

    replaceUsersOnlineMap: (map) =>
        set((state) => ({
            userPresenceState: { ...state.userPresenceState, usersOnlineMap: map },
        })),

    setUserIdsToCommentIds: (map) =>
        set((state) => ({
            userPresenceState: { ...state.userPresenceState, userIdsToCommentIds: map },
        })),

    addCommentIdForUser: (userId, commentId) =>
        set((state) => {
            const next = { ...state.userPresenceState.userIdsToCommentIds };
            const existing = next[userId];
            if (existing) {
                if (existing.includes(commentId)) return state as Partial<FastCommentsStoreState> as any;
                next[userId] = [...existing, commentId];
            } else {
                next[userId] = [commentId];
            }
            return {
                userPresenceState: {
                    ...state.userPresenceState,
                    userIdsToCommentIds: next,
                },
            };
        }),

    setHeartbeatActive: (active) =>
        set((state) => ({
            userPresenceState: { ...state.userPresenceState, heartbeatActive: active },
        })),

    setPresencePollState: (presencePollState) =>
        set((state) => ({
            userPresenceState: { ...state.userPresenceState, presencePollState },
        })),

    setWsConnected: (connected) => set({ wsConnected: connected }),

    setSubscriberCount: (count) => set({ subscriberCount: count }),
});
