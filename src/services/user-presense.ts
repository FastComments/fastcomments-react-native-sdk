import {FastCommentsCommentWidgetConfig, FastCommentsWidgetComment} from 'fastcomments-typescript';
import {FastCommentsState, UserPresenceState} from "../types/fastcomments-state";
import {iterateCommentsTree} from "./comment-trees";
import {createURLQueryString, makeRequest} from "./http";
import {GetUserPresenceStatusesResponse} from "../types/dto/get-user-presence-statuses";

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

/**
 * @typedef {Object} UserPresenceState
 * @property {boolean} [heartbeatActive]
 * @property {UserPresencePollStateEnum} [presencePollState]
 * @property {Object.<string, boolean>} usersOnlineMap
 * @property {Object.<string, Array.<string>>} userIdsToCommentIds
 */

/**
 *
 * @param {Object} config
 * @param {string} urlIdWS
 * @param {UserPresenceState} state
 */
export async function setupUserPresenceState(config: FastCommentsCommentWidgetConfig, urlIdWS: string, state: FastCommentsState) {
    if (config.disableLiveCommenting || state.userPresenceState.presencePollState === UserPresencePollStateEnum.Disabled) {
        return;
    }
    const userIdsToCheck = {};

    // TODO add optimization back - remove these two lines
    state.userPresenceState.userIdsToCommentIds = {};
    state.userPresenceState.usersOnlineMap = {};
    iterateCommentsTree(state.commentsTree, function (comment) {
        addCommentToUserPresenceState(state.userPresenceState, comment, userIdsToCheck);
    });
    const userIds = Object.keys(userIdsToCheck);
    if (userIds.length > 0) {
        await getAndUpdateUserStatuses(config, urlIdWS, state.userPresenceState, userIds);
    } else if (!state.userPresenceState.heartbeatActive) {
        setupUserPresenceHeartbeat(config, urlIdWS);
        setupUserPresencePolling(config, urlIdWS, state.userPresenceState, userIds);
        state.userPresenceState.heartbeatActive = true;
    }
}

async function getAndUpdateUserStatuses(config: FastCommentsCommentWidgetConfig, urlIdWS: string, state: UserPresenceState, userIds: string[]) {
    const response = await makeRequest<GetUserPresenceStatusesResponse>({
        apiHost: config.apiHost!,
        method: 'GET',
        url: '/user-presence-status' + createURLQueryString({
            tenantId: config.tenantId,
            urlIdWS: urlIdWS,
            userIds: userIds.join(',')
        })
    });
    if (response.status === 'success' && response.userIdsOnline) {
        for (const userId in response.userIdsOnline) {
            const isOnline = response.userIdsOnline[userId];
            if (state.usersOnlineMap[userId] !== isOnline) {
                state.usersOnlineMap[userId] = isOnline;
            }
        }
    }
    if (!state.heartbeatActive) {
        setupUserPresenceHeartbeat(config, urlIdWS);
        setupUserPresencePolling(config, urlIdWS, state, userIds);
        state.heartbeatActive = true;
    }
}

export async function handleNewRemoteUser(config: FastCommentsCommentWidgetConfig, urlIdWS: string, state: UserPresenceState, userIds: string[]) {
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
            if (state.usersOnlineMap[userId] !== isOnline) {
                state.usersOnlineMap[userId] = isOnline;
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
export function addCommentToUserPresenceState(state: UserPresenceState, comment: FastCommentsWidgetComment, changes: Record<string, boolean>) {
    if (comment.userId) {
        if (!state.userIdsToCommentIds[comment.userId]) {
            state.userIdsToCommentIds[comment.userId] = [];
            if (changes && state.usersOnlineMap[comment.userId] === undefined) {
                changes[comment.userId] = true;
            }
        }
        if (!state.userIdsToCommentIds[comment.userId].includes(comment._id)) {
            state.userIdsToCommentIds[comment.userId].push(comment._id);
        }
    }
    if (comment.anonUserId) {
        if (!state.userIdsToCommentIds[comment.anonUserId]) {
            state.userIdsToCommentIds[comment.anonUserId] = [];
            if (changes && state.usersOnlineMap[comment.anonUserId] === undefined) {
                changes[comment.anonUserId] = true;
            }
        }
        if (!state.userIdsToCommentIds[comment.anonUserId].includes(comment._id)) {
            state.userIdsToCommentIds[comment.anonUserId].push(comment._id);
        }
    }
}

/**
 * @param {Object} config
 * @param {string} urlIdWS
 */
function setupUserPresenceHeartbeat(config: FastCommentsCommentWidgetConfig, urlIdWS: string) {
    async function next() {
        try {
            await makeRequest({
                apiHost: config.apiHost!,
                method: 'PUT',
                url: '/user-presence-heartbeat' + createURLQueryString({
                    tenantId: config.tenantId,
                    urlIdWS: urlIdWS,
                    sso: config.sso ? JSON.stringify(config.sso) : undefined
                })
            });
        } catch (e) {}
        setTimeout(next, 1800000); // every 30 minutes on success or failure
    }

    setTimeout(next, 1800000); // every 30 minutes
}

function setupUserPresencePolling(config: FastCommentsCommentWidgetConfig, urlIdWS: string, state: UserPresenceState, userIds: string[]) {
    if (state.presencePollState === UserPresencePollStateEnum.Poll) {
        const offset = Math.ceil(10000 * Math.random());
        const timeout = 30000 + offset; // every 30 seconds + a random offset
        async function next() {
            await getAndUpdateUserStatuses(config, urlIdWS, state, userIds);
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
