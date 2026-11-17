import { FastCommentsServerSDK } from 'fastcomments-sdk/server';
import type { CommentPoll, CommentPollInput } from 'fastcomments-sdk';
import { FC_HOST, getE2EApiKey, logHttp } from './host';
import { TestTenant } from './tenant';

function newBroadcastId(): string {
    return `${Math.random().toString(36).slice(2)}.${Date.now()}`;
}

/**
 * Stores a widget customization for every page of the tenant (domain and urlId '*'), the same way the Android
 * suite's E2eTestApi.createCustomConfig does. Polls render only while `pollCreation` is set.
 */
export async function createCustomConfig(tenant: TestTenant, config: Record<string, unknown>): Promise<void> {
    const url = `${FC_HOST}/test-e2e/api/custom-configs?API_KEY=${encodeURIComponent(getE2EApiKey())}`;
    logHttp('POST', url, config);
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant.tenantId, name: 'RN Test Config', domain: '*', urlId: '*', config }),
    });
    if (!res.ok) {
        throw new Error(`createCustomConfig failed: status=${res.status} body=${(await res.text()).slice(0, 300)}`);
    }
}

export interface SeedPollParams {
    tenant: TestTenant;
    urlId: string;
    text: string;
    ssoToken: string;
    poll: CommentPollInput;
}

/** Posts a comment with a poll as the SSO user, the way the widget does. Returns its id. */
export async function seedPollComment(params: SeedPollParams): Promise<string> {
    const { tenant, urlId, text, ssoToken, poll } = params;
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    logHttp('SDK', 'createCommentPublic (poll)', { tenantId: tenant.tenantId, urlId });
    const json = await sdk.publicApi.createCommentPublic({
        tenantId: tenant.tenantId,
        urlId,
        broadcastId: newBroadcastId(),
        commentData: { comment: text, commenterName: 'Tester', url: urlId, urlId, poll },
        sso: ssoToken,
    });
    if (json.status !== 'success' || !json.comment?.id) {
        throw new Error(`seedPollComment failed: ${JSON.stringify(json).slice(0, 400)}`);
    }
    return json.comment.id;
}

/** The poll as the server has it, read with the tenant API key. */
export async function fetchPoll(tenant: TestTenant, commentId: string): Promise<CommentPoll> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST, apiKey: tenant.apiKey });
    logHttp('SDK', 'getPoll', { tenantId: tenant.tenantId, commentId });
    const json = await sdk.defaultApi.getPoll({ tenantId: tenant.tenantId, commentId });
    return json.poll;
}

/** Votes as an SSO user without going through the UI. */
export async function votePollAs(tenant: TestTenant, urlId: string, commentId: string, optionId: string, ssoToken: string): Promise<void> {
    const sdk = new FastCommentsServerSDK({ basePath: FC_HOST });
    logHttp('SDK', 'votePoll', { tenantId: tenant.tenantId, commentId, optionId });
    await sdk.publicApi.votePoll({
        tenantId: tenant.tenantId,
        commentId,
        votePollBody: { optionId },
        urlId,
        broadcastId: newBroadcastId(),
        sso: ssoToken,
    });
}
