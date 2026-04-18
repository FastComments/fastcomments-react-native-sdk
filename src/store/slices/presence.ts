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
});
