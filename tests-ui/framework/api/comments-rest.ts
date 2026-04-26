import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { CommentData } from 'fastcomments-sdk';
import { FC_HOST, logHttp } from './host';
import { TestTenant } from './tenant';

export interface SeedCommentParams {
    tenant: TestTenant;
    urlId: string;
    text: string;
    ssoToken: string;
    parentId?: string;
}

function newBroadcastId(): string {
    return `${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

/**
 * Posts a comment via the public comments POST endpoint, authenticating the
 * commenter with the supplied SSO token. Returns the created comment id.
 */
export async function seedComment(params: SeedCommentParams): Promise<string> {
    const { tenant, urlId, text, ssoToken, parentId } = params;
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    const commentData: CommentData = {
        comment: text,
        commenterName: 'Tester',
        commenterEmail: 'tester@fctest.com',
        url: urlId,
        urlId,
        parentId: parentId ?? null,
    };
    logHttp('SDK', 'createCommentPublic', { tenantId: tenant.tenantId, urlId });
    const json = await sdk.publicApi.createCommentPublic({
        tenantId: tenant.tenantId,
        urlId,
        broadcastId: newBroadcastId(),
        commentData,
        sso: ssoToken,
    });
    if (json.status !== 'success' || !json.comment?.id) {
        throw new Error(`seedComment failed: status=${json.status} body=${JSON.stringify(json).slice(0, 400)}`);
    }
    return json.comment.id;
}

/**
 * Returns the most recent comment id for a urlId, polling up to 3 times with
 * 500ms gaps to absorb the eventual-consistency window.
 */
export async function fetchLatestCommentId(tenant: TestTenant, urlId: string): Promise<string | null> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST, apiKey: tenant.apiKey });
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            logHttp('SDK', 'getComments', { tenantId: tenant.tenantId, urlId, limit: 1 });
            const json = await sdk.defaultApi.getComments({
                tenantId: tenant.tenantId,
                urlId,
                limit: 1,
            });
            if (json.comments && json.comments[0]) return json.comments[0].id;
        } catch (e) {
            logHttp('fetchLatestCommentId attempt failed:', (e as Error).message);
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
    return null;
}
