import { createURLQueryString, makeRequest } from './http';

export interface MentionUser {
    id: string;
    name: string;
    displayName?: string;
    avatarSrc?: string | null;
    type: 'user' | 'sso';
}

export interface SearchUsersResponse {
    status: 'success' | 'failed';
    users?: MentionUser[];
    code?: string;
    reason?: string;
}

export interface SearchUsersParams {
    apiHost: string;
    tenantId: string;
    urlId: string;
    usernameStartsWith: string;
    sso?: string;
    signal?: AbortSignal;
}

/**
 * Public mention search via /user-search/{tenantId}?urlId=...&usernameStartsWith=...
 * Mirrors the Android SDK's `searchUsers` call. Returns the raw array of users
 * (empty when query is blank).
 */
export async function searchMentionUsers(params: SearchUsersParams): Promise<MentionUser[]> {
    const { apiHost, tenantId, urlId, usernameStartsWith, sso } = params;
    if (!usernameStartsWith.trim()) return [];
    const query = createURLQueryString({
        urlId,
        usernameStartsWith,
        sso,
    });
    const response = await makeRequest<SearchUsersResponse>({
        apiHost,
        method: 'GET',
        url: `/user-search/${tenantId}${query}`,
    });
    if (response.status !== 'success' || !response.users) return [];
    return response.users;
}
