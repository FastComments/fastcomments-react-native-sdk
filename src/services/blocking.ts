import {createURLQueryString, makeRequest} from "./http";
import {CheckedBlockedCommentsResponse} from "../types/dto/checked-blocked-comments";
import {FastCommentsState} from "../types/fastcomments-state";

// this is used for handling live events since the pub-sub server is stateless.
export async function checkBlockedComments(state: FastCommentsState, commentIds: string[]): Promise<Record<string, boolean>> {
    if (state.currentUser && 'hasBlockedUsers' in state.currentUser && state.currentUser.hasBlockedUsers) {
        try {
            const response = await makeRequest<CheckedBlockedCommentsResponse>({
                apiHost: state.apiHost,
                method: 'GET',
                url: '/check-blocked-comments' + createURLQueryString({
                    commentIds: commentIds.join(','),
                    tenantId: state.config.tenantId,
                    sso: state.ssoConfigString
                }),
            });
            return response.commentStatuses;
        } catch (e) {
            console.error(e);
            const result: Record<string, boolean> = {}; // on failure just assume all visible
            for (const id of commentIds) {
                result[id] = false;
            }
            return result;
        }
    } else {
        const result: Record<string, boolean> = {}; // just assume all visible
        for (const id of commentIds) {
            result[id] = false;
        }
        return result;
    }
}
