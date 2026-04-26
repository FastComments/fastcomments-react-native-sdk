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
    const url =
        `${FC_HOST}/comments/${tenant.tenantId}/${commentId}/pin?` +
        `broadcastId=${encodeURIComponent(newBroadcastId())}&` +
        `sso=${encodeURIComponent(adminSsoToken)}`;
    logHttp('POST', url);
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`pinComment failed: ${res.status} body=${body.slice(0, 400)}`);
    }
}

export async function lockComment(
    tenant: TestTenant,
    commentId: string,
    adminSsoToken: string
): Promise<void> {
    const url =
        `${FC_HOST}/comments/${tenant.tenantId}/${commentId}/lock?` +
        `broadcastId=${encodeURIComponent(newBroadcastId())}&` +
        `sso=${encodeURIComponent(adminSsoToken)}`;
    logHttp('POST', url);
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`lockComment failed: ${res.status} body=${body.slice(0, 400)}`);
    }
}

/**
 * Admin update via the v1 API. `params` is a partial CommentUpdate (e.g.
 * `{ approved: true }`). Tenant API key is sent as the x-api-key header.
 */
export async function adminUpdateComment(
    tenant: TestTenant,
    commentId: string,
    params: Record<string, unknown>
): Promise<void> {
    const url = `${FC_HOST}/api/v1/comments/${commentId}?tenantId=${encodeURIComponent(tenant.tenantId)}`;
    logHttp('PATCH', url);
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'x-api-key': tenant.apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`adminUpdateComment failed (${res.status}): ${text.slice(0, 200)}`);
    }
}
