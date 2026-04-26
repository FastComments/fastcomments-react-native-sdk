import { FC_HOST, logHttp } from './host';
import { TestTenant } from './tenant';

export interface SeedCommentParams {
    tenant: TestTenant;
    urlId: string;
    text: string;
    ssoToken: string;
    parentId?: string;
}

interface SaveCommentResponse {
    status: string;
    comment?: { _id: string; id?: string };
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
    const url =
        `${FC_HOST}/comments/${tenant.tenantId}/?` +
        `broadcastId=${encodeURIComponent(newBroadcastId())}&` +
        `urlId=${encodeURIComponent(urlId)}&` +
        `sso=${encodeURIComponent(ssoToken)}`;
    logHttp('POST', url);
    const body: Record<string, unknown> = {
        comment: text,
        commenterName: 'Tester',
        commenterEmail: 'tester@fctest.com',
        url: urlId,
        urlId,
    };
    if (parentId) body.parentId = parentId;

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as SaveCommentResponse;
    if (json.status !== 'success' || !json.comment?._id) {
        throw new Error(`seedComment failed: status=${json.status} body=${JSON.stringify(json).slice(0, 400)}`);
    }
    return json.comment._id;
}

/**
 * Returns the most recent comment id for a urlId, polling up to 3 times with
 * 500ms gaps to absorb the eventual-consistency window.
 */
export async function fetchLatestCommentId(tenant: TestTenant, urlId: string): Promise<string | null> {
    const url = `${FC_HOST}/api/v1/comments?tenantId=${encodeURIComponent(tenant.tenantId)}&urlId=${encodeURIComponent(urlId)}&limit=1`;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            logHttp('GET', url);
            const res = await fetch(url, { method: 'GET', headers: { 'x-api-key': tenant.apiKey } });
            if (res.ok) {
                const json = (await res.json()) as { comments?: Array<{ _id: string }> };
                if (json.comments && json.comments[0]) return json.comments[0]._id;
            }
        } catch (e) {
            logHttp('fetchLatestCommentId attempt failed:', (e as Error).message);
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
    }
    return null;
}
