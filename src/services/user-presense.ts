import { FastCommentsCommentWidgetConfig, FastCommentsWidgetComment } from 'fastcomments-typescript';
import { UserPresencePollStateEnum } from '../types/fastcomments-state';
import type { FastCommentsStore } from '../store/types';

export async function setupUserPresenceState(store: FastCommentsStore, urlIdWS: string) {
    const state = store.getState();
    if (
        state.config.disableLiveCommenting ||
        state.userPresenceState.presencePollState === UserPresencePollStateEnum.Disabled
    ) {
        return;
    }

    state.replaceUsersOnlineMap({});
    state.setUserIdsToCommentIds({});

    const changes: Record<string, boolean> = {};
    for (const id in state.byId) {
        addCommentToPresenceIndex(store, state.byId[id], changes);
    }
    const userIds = Object.keys(changes);
    if (userIds.length > 0) {
        await getAndUpdateUserStatuses(
            state.apiHost,
            state.config.tenantId,
            state.ssoConfigString,
            urlIdWS,
            store,
            userIds
        );
    } else if (!state.userPresenceState.heartbeatActive) {
        setupUserPresencePolling(
            state.apiHost,
            state.config.tenantId,
            state.ssoConfigString,
            urlIdWS,
            store,
            userIds
        );
        state.setHeartbeatActive(true);
    }
}

async function getAndUpdateUserStatuses(
    apiHost: string,
    tenantId: string | undefined,
    ssoConfigString: string | undefined,
    urlIdWS: string,
    store: FastCommentsStore,
    userIds: string[]
) {
    const sdk = store.getState().sdk;
    const response = await sdk.publicApi.getUserPresenceStatuses({
        tenantId: tenantId!,
        urlIdWS,
        userIds: userIds.join(','),
    });
    if (response.status === 'success' && response.userIdsOnline) {
        const state = store.getState();
        const onlineMap = state.userPresenceState.usersOnlineMap;
        const becameOnline: string[] = [];
        const becameOffline: string[] = [];
        for (const userId in response.userIdsOnline) {
            const isOnline = response.userIdsOnline[userId];
            if (!!onlineMap[userId] === isOnline) continue;
            (isOnline ? becameOnline : becameOffline).push(userId);
        }
        if (becameOnline.length > 0) state.setUsersOnline(becameOnline, true);
        if (becameOffline.length > 0) state.setUsersOnline(becameOffline, false);
    }
    const state = store.getState();
    if (!state.userPresenceState.heartbeatActive) {
        setupUserPresencePolling(apiHost, tenantId, ssoConfigString, urlIdWS, store, userIds);
        state.setHeartbeatActive(true);
    }
}

export async function handleNewRemoteUser(
    config: FastCommentsCommentWidgetConfig,
    urlIdWS: string,
    store: FastCommentsStore,
    userIds: string[]
) {
    const sdk = store.getState().sdk;
    const response = await sdk.publicApi.getUserPresenceStatuses({
        tenantId: config.tenantId!,
        urlIdWS,
        userIds: userIds.join(','),
    });
    if (response.status === 'success' && response.userIdsOnline) {
        const state = store.getState();
        const onlineMap = state.userPresenceState.usersOnlineMap;
        const becameOnline: string[] = [];
        const becameOffline: string[] = [];
        for (const userId in response.userIdsOnline) {
            const isOnline = response.userIdsOnline[userId];
            if (!!onlineMap[userId] === isOnline) continue;
            (isOnline ? becameOnline : becameOffline).push(userId);
        }
        if (becameOnline.length > 0) state.setUsersOnline(becameOnline, true);
        if (becameOffline.length > 0) state.setUsersOnline(becameOffline, false);
    }
}

export function addCommentToPresenceIndex(
    store: FastCommentsStore,
    comment: FastCommentsWidgetComment,
    changes?: Record<string, boolean>
) {
    const state = store.getState();
    const userIdsToCommentIds = state.userPresenceState.userIdsToCommentIds;
    if (comment.userId) {
        if (!userIdsToCommentIds[comment.userId]) {
            if (changes && state.userPresenceState.usersOnlineMap[comment.userId] === undefined) {
                changes[comment.userId] = true;
            }
        }
        state.addCommentIdForUser(comment.userId, comment._id);
    }
    if (comment.anonUserId) {
        if (!userIdsToCommentIds[comment.anonUserId]) {
            if (changes && state.userPresenceState.usersOnlineMap[comment.anonUserId] === undefined) {
                changes[comment.anonUserId] = true;
            }
        }
        state.addCommentIdForUser(comment.anonUserId, comment._id);
    }
}

function setupUserPresencePolling(
    apiHost: string,
    tenantId: string | undefined,
    ssoConfigString: string | undefined,
    urlIdWS: string,
    store: FastCommentsStore,
    userIds: string[]
) {
    if (store.getState().userPresenceState.presencePollState === UserPresencePollStateEnum.Poll) {
        const offset = Math.ceil(10000 * Math.random());
        const timeout = 30000 + offset;
        async function next() {
            await getAndUpdateUserStatuses(apiHost, tenantId, ssoConfigString, urlIdWS, store, userIds);
            setTimeout(next, timeout);
        }
        setTimeout(next, timeout);
    }
}

// Legacy export kept for the live.ts migration. Same-signature version of
// addCommentToPresenceIndex that older callers expect.
export const addCommentToUserPresenceState = addCommentToPresenceIndex;
