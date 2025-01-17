import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from 'fastcomments-typescript';
import {FastCommentsState, UserPresenceState} from "../types";
import {iterateCommentsTree} from "./comment-trees";
import {createURLQueryString, makeRequest} from "./http";
import {GetUserPresenceStatusesResponse} from "../types";
import {ImmutableObject, State} from "@hookstate/core";

/**
 * @typedef {number} UserPresencePollState
 **/


/**
 * @enum {UserPresencePollState}
 */
const UserPresencePollStateEnum = {
    Disabled: 0,
    Poll: 1
};

const STEALTH = {stealth: true};

/**
 * @typedef {Object} UserPresenceState
 * @property {boolean} [heartbeatActive]
 * @property {UserPresencePollStateEnum} [presencePollState]
 * @property {Object.<string, boolean>} usersOnlineMap
 * @property {Object.<string, Array.<string>>} userIdsToCommentIds
 */

export async function setupUserPresenceState(state: State<FastCommentsState>, urlIdWS: string) {
    if (state.config.disableLiveCommenting.get() || state.userPresenceState.presencePollState.get() === UserPresencePollStateEnum.Disabled) {
        return;
    }
    const userIdsToCheck = {};

    // TODO add optimization back - remove these two lines
    state.userPresenceState.userIdsToCommentIds.set({});
    state.userPresenceState.usersOnlineMap.set({});
    iterateCommentsTree(state.commentsTree.get(), function (comment) {
        addCommentToUserPresenceState(state.userPresenceState, comment, userIdsToCheck);
    });
    const userIds = Object.keys(userIdsToCheck);
    if (userIds.length > 0) {
        await getAndUpdateUserStatuses(state.apiHost.get(STEALTH), state.config.tenantId.get(STEALTH), state.ssoConfigString.get(STEALTH), urlIdWS, state.userPresenceState, userIds);
    } else if (!state.userPresenceState.heartbeatActive.get()) {
        setupUserPresenceHeartbeat(state.apiHost.get(STEALTH), state.config.tenantId.get(STEALTH), state.ssoConfigString.get(STEALTH),  urlIdWS);
        setupUserPresencePolling(state.apiHost.get(STEALTH), state.config.tenantId.get(STEALTH), state.ssoConfigString.get(STEALTH),  urlIdWS, state.userPresenceState, userIds);
        state.userPresenceState.heartbeatActive.set(true);
    }
}

async function getAndUpdateUserStatuses(apiHost: string, tenantId: string, ssoConfigString: string | undefined, urlIdWS: string, userPresenceState: State<UserPresenceState>, userIds: string[]) {
    const response = await makeRequest<GetUserPresenceStatusesResponse>({
        apiHost,
        method: 'GET',
        url: '/user-presence-status' + createURLQueryString({
            tenantId,
            urlIdWS: urlIdWS,
            userIds: userIds.join(',')
        })
    });
    if (response.status === 'success' && response.userIdsOnline) {
        for (const userId in response.userIdsOnline) {
            const isOnline = response.userIdsOnline[userId];
            if (userPresenceState.usersOnlineMap[userId].get() !== isOnline) {
                userPresenceState.usersOnlineMap[userId].set(isOnline);
            }
        }
    }
    if (!userPresenceState.heartbeatActive.get()) {
        setupUserPresenceHeartbeat(apiHost, tenantId, ssoConfigString, urlIdWS);
        setupUserPresencePolling(apiHost, tenantId, ssoConfigString, urlIdWS, userPresenceState, userIds);
        userPresenceState.heartbeatActive.set(true);
    }
}

// TODO OPTIMIZE don't take whole config object due to required get() call in callers
export async function handleNewRemoteUser(config: ImmutableObject<FastCommentsCommentWidgetConfig>, urlIdWS: string, state: State<UserPresenceState>, userIds: string[]) {
    const response = await makeRequest<GetUserPresenceStatusesResponse>({
        apiHost: config.apiHost!,
        method: 'GET',
        url: '/user-presence-status' + createURLQueryString({
            tenantId: config.tenantId,
            urlIdWS: urlIdWS,
            userIds: userIds
        })
    });
    if (response.status === 'success' && response.userIdsOnline) {
        for (const userId in response.userIdsOnline) {
            const isOnline = response.userIdsOnline[userId];
            if (state.usersOnlineMap[userId].get() !== isOnline) {
                state.usersOnlineMap[userId].set(isOnline);
            }
        }
    }
}

/**
 *
 * @param {UserPresenceState} state
 * @param {comment} comment
 * @param {Object.<string, boolean>} [changes]
 */
export function addCommentToUserPresenceState(state: State<UserPresenceState>, comment: ImmutableObject<FastCommentsWidgetComment>, changes: Record<string, boolean>) {
    if (comment.userId || comment.anonUserId) { // OPTIMIZATION
        state.userIdsToCommentIds.set((userIdsToCommentIds) => {
            if (comment.userId) {
                if (!userIdsToCommentIds[comment.userId]) {
                    userIdsToCommentIds[comment.userId] = [];
                    if (changes && state.usersOnlineMap[comment.userId] === undefined) {
                        changes[comment.userId] = true;
                    }
                }
                if (!userIdsToCommentIds[comment.userId].includes(comment._id)) {
                    userIdsToCommentIds[comment.userId].push(comment._id);
                }
            }
            if (comment.anonUserId) {
                if (!userIdsToCommentIds[comment.anonUserId]) {
                    userIdsToCommentIds[comment.anonUserId] = [];
                    if (changes && state.usersOnlineMap[comment.anonUserId] === undefined) {
                        changes[comment.anonUserId] = true;
                    }
                }
                if (!userIdsToCommentIds[comment.anonUserId].includes(comment._id)) {
                    userIdsToCommentIds[comment.anonUserId].push(comment._id);
                }
            }
            return userIdsToCommentIds;
        });
    }
}

function setupUserPresenceHeartbeat(apiHost: string, tenantId: string, ssoConfigString: string | undefined, urlIdWS: string) {
    async function next() {
        try {
            await makeRequest({
                apiHost,
                method: 'PUT',
                url: '/user-presence-heartbeat' + createURLQueryString({
                    tenantId,
                    urlIdWS: urlIdWS,
                    sso: ssoConfigString
                })
            });
        } catch (e) {
        }
        setTimeout(next, 1800000); // every 30 minutes on success or failure
    }

    setTimeout(next, 1800000); // every 30 minutes
}

function setupUserPresencePolling(apiHost: string, tenantId: string, ssoConfigString: string | undefined, urlIdWS: string, userPresenceState: State<UserPresenceState>, userIds: string[]) {
    if (userPresenceState.presencePollState?.get() === UserPresencePollStateEnum.Poll) {
        const offset = Math.ceil(10000 * Math.random());
        const timeout = 30000 + offset; // every 30 seconds + a random offset
        async function next() {
            await getAndUpdateUserStatuses(apiHost, tenantId, ssoConfigString, urlIdWS, userPresenceState, userIds);
            setTimeout(next, timeout);
        }

        setTimeout(next, timeout);
    }
}

// export function updateUserActivityMonitors(config: FastCommentsCommentWidgetConfig, state: FastCommentsState, userId: string, isOnline: boolean) {
//     if (config.disableLiveCommenting) {
//         return;
//     }
//     if (typeof isOnline === 'boolean') {
//         state.usersOnlineMap[userId] = isOnline;
//     }
// }
