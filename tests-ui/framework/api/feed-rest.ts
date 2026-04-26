import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import { FC_HOST, logHttp } from './host';
import { TestTenant } from './tenant';

export interface SeedFeedPostParams {
    tenant: TestTenant;
    ssoToken: string;
    title?: string;
    contentHTML?: string;
    tags?: string[];
}

function newBroadcastId(): string {
    return `${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

/**
 * Creates a feed post via the public createFeedPostPublic endpoint, signed
 * with the supplied SSO token. Returns the created post id.
 */
export async function seedFeedPost(params: SeedFeedPostParams): Promise<string> {
    const { tenant, ssoToken, title, contentHTML, tags } = params;
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    logHttp('SDK', 'createFeedPostPublic', { tenantId: tenant.tenantId, title });
    const json = await sdk.publicApi.createFeedPostPublic({
        tenantId: tenant.tenantId,
        broadcastId: newBroadcastId(),
        sso: ssoToken,
        createFeedPostParams: {
            title,
            contentHTML: contentHTML ?? '<p>seeded</p>',
            tags,
        },
    });
    if (json.status !== 'success' || !json.feedPost?.id) {
        throw new Error(`seedFeedPost failed: status=${json.status} body=${JSON.stringify(json).slice(0, 400)}`);
    }
    return json.feedPost.id;
}
