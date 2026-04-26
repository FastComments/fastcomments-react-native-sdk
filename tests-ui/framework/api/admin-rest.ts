import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { UpdatableCommentParams } from 'fastcomments-sdk';
import { FC_HOST, logHttp } from './host';
import { TestTenant } from './tenant';

function newBroadcastId(): string {
    return `${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

/**
 * Pin a comment as the admin. The admin SSO token must belong to a user with
 * `isAdmin: true` (use `buildTestUser('admin', { isAdmin: true })` + `makeSecureSSOToken`).
 */
export async function pinComment(
    tenant: TestTenant,
    commentId: string,
    adminSsoToken: string
): Promise<void> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    logHttp('SDK', 'pinComment', { tenantId: tenant.tenantId, commentId });
    await sdk.publicApi.pinComment({
        tenantId: tenant.tenantId,
        commentId,
        broadcastId: newBroadcastId(),
        sso: adminSsoToken,
    });
}

export async function lockComment(
    tenant: TestTenant,
    commentId: string,
    adminSsoToken: string
): Promise<void> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    logHttp('SDK', 'lockComment', { tenantId: tenant.tenantId, commentId });
    await sdk.publicApi.lockComment({
        tenantId: tenant.tenantId,
        commentId,
        broadcastId: newBroadcastId(),
        sso: adminSsoToken,
    });
}

/**
 * Admin update via the v1 API. `params` is a partial UpdatableCommentParams
 * (e.g. `{ approved: true }`). Tenant API key is sent as the x-api-key header
 * by the SDK.
 */
export async function adminUpdateComment(
    tenant: TestTenant,
    commentId: string,
    params: UpdatableCommentParams
): Promise<void> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST, apiKey: tenant.apiKey });
    logHttp('SDK', 'updateComment', { tenantId: tenant.tenantId, commentId });
    await sdk.defaultApi.updateComment({
        tenantId: tenant.tenantId,
        id: commentId,
        updatableCommentParams: params,
    });
}
