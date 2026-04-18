import { createURLQueryString, makeRequest } from './http';
import { CheckedBlockedCommentsResponse } from '../types';
import type { FastCommentsStore } from '../store/types';

// Used for handling live events since the pub-sub server is stateless.
export async function checkBlockedComments(
    store: FastCommentsStore,
    commentIds: string[]
): Promise<Record<string, boolean>> {
    const state = store.getState();
    if (state.currentUser && 'hasBlockedUsers' in state.currentUser && state.currentUser.hasBlockedUsers) {
        try {
            const response = await makeRequest<CheckedBlockedCommentsResponse>({
                apiHost: state.apiHost,
                method: 'GET',
                url:
                    '/check-blocked-comments' +
                    createURLQueryString({
                        commentIds: commentIds.join(','),
                        tenantId: state.config.tenantId,
                        sso: state.ssoConfigString,
                    }),
            });
            return response.commentStatuses;
        } catch (e) {
            console.error(e);
            const result: Record<string, boolean> = {};
            for (const id of commentIds) result[id] = false;
            return result;
        }
    }
    const result: Record<string, boolean> = {};
    for (const id of commentIds) result[id] = false;
    return result;
}
