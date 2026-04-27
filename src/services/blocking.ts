import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { FastCommentsStore } from '../store/types';

// Used for handling live events since the pub-sub server is stateless.
export async function checkBlockedComments(
    store: FastCommentsStore,
    commentIds: string[]
): Promise<Record<string, boolean>> {
    const state = store.getState();
    if (state.currentUser && 'hasBlockedUsers' in state.currentUser && state.currentUser.hasBlockedUsers) {
        try {
            const sdk = new FastCommentsServerSDK({ basePath: state.apiHost });
            const response = await sdk.publicApi.checkedCommentsForBlocked({
                tenantId: state.config.tenantId!,
                commentIds: commentIds.join(','),
                sso: state.ssoConfigString,
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
