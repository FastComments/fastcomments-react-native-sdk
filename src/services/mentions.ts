import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { SearchUsers200Response } from 'fastcomments-sdk';

export interface MentionUser {
    id: string;
    name: string;
    displayName?: string;
    avatarSrc?: string | null;
    type: 'user' | 'sso';
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
    const sdk = new FastCommentsServerSDK({ basePath: apiHost });
    const apiResponse = await sdk.publicApi.searchUsersRaw({
        tenantId,
        urlId,
        usernameStartsWith,
        sso,
    });
    // The SDK's typed parser requires a 'sections' field that the legacy
    // (non-sectioned) endpoint omits, so parse the raw JSON instead.
    const response = (await apiResponse.raw.json()) as Partial<SearchUsers200Response>;
    if (response.status !== 'success' || !response.users) return [];
    return response.users.map((user) => ({
        id: user.id,
        name: user.name,
        displayName: user.displayName,
        avatarSrc: user.avatarSrc,
        type: user.type === 'sso' ? 'sso' : 'user',
    }));
}
