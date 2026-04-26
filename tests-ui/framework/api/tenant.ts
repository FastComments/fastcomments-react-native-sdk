import { CookieJar, hostOf, readSetCookieHeaders } from './cookies';
import { FC_HOST, getE2EApiKey, logHttp } from './host';

export interface TestTenant {
    tenantId: string;
    apiKey: string;
    email: string;
}

interface TenantByEmailResponse {
    status: 'success' | 'failed';
    tenant?: { _id: string };
}

export async function deleteTenantByEmail(email: string): Promise<void> {
    const url = `${FC_HOST}/test-e2e/api/tenant/by-email/${encodeURIComponent(email)}?API_KEY=${encodeURIComponent(getE2EApiKey())}`;
    logHttp('DELETE', url);
    try {
        await fetch(url, { method: 'DELETE' });
    } catch (e) {
        logHttp('deleteTenantByEmail failed (ok if first run):', (e as Error).message);
    }
}

export async function fetchTenantByEmail(email: string): Promise<{ _id: string } | null> {
    const url = `${FC_HOST}/test-e2e/api/tenant/by-email/${encodeURIComponent(email)}?API_KEY=${encodeURIComponent(getE2EApiKey())}`;
    logHttp('GET', url);
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const body = (await res.json()) as TenantByEmailResponse;
    return body.tenant ?? null;
}

/**
 * Creates a test tenant by hitting the public signup form (the same path a real
 * user takes), then resolves its _id via the e2e admin API and scrapes the API
 * key from the api-secret HTML page (which requires the signup-session cookie).
 */
export async function createTestTenant(email: string): Promise<TestTenant> {
    if (!email.endsWith('@fctest.com')) {
        throw new Error(`Test tenant email must end in @fctest.com (got "${email}")`);
    }
    await deleteTenantByEmail(email);

    const jar = new CookieJar();
    const name = email.split('@')[0];

    // 1. POST signup form
    const signupBody = new URLSearchParams({
        username: name,
        email,
        companyName: name,
        domains: `${name}.example.com`,
        packageId: 'adv',
        noTracking: 'true',
    });
    const signupUrl = `${FC_HOST}/auth/tenant-signup`;
    logHttp('POST', signupUrl);
    // `redirect` is supported by Node fetch but is not in the type def without
    // `lib: ["dom"]`, so we widen via a typed local before passing.
    const signupOpts: RequestInit & { redirect?: 'manual' | 'follow' } = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: signupBody.toString(),
        redirect: 'manual',
    };
    const signupRes = await fetch(signupUrl, signupOpts);
    jar.saveFromResponse(hostOf(signupUrl), readSetCookieHeaders(signupRes.headers));
    if (signupRes.status !== 200 && signupRes.status !== 302 && signupRes.status !== 303) {
        const text = await signupRes.text().catch(() => '');
        throw new Error(`Tenant signup failed (${signupRes.status}): ${text.slice(0, 400)}`);
    }

    // 2. Resolve tenantId via test-e2e API
    const tenant = await fetchTenantByEmail(email);
    if (!tenant) {
        throw new Error(`Tenant not found by email after signup: ${email}`);
    }
    const tenantId = tenant._id;

    // 3. Scrape API key from HTML
    const apiSecretUrl = `${FC_HOST}/auth/my-account/api-secret`;
    const cookieHeader = jar.cookieHeader(hostOf(apiSecretUrl));
    logHttp('GET', apiSecretUrl, 'with-cookies:', !!cookieHeader);
    const apiSecretRes = await fetch(apiSecretUrl, {
        method: 'GET',
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });
    if (!apiSecretRes.ok) {
        const text = await apiSecretRes.text().catch(() => '');
        throw new Error(
            `api-secret fetch failed (${apiSecretRes.status}): ${text.slice(0, 200)}`
        );
    }
    const html = await apiSecretRes.text();
    const apiKey = extractApiKey(html);
    if (!apiKey) {
        throw new Error(
            'Failed to extract API key from /auth/my-account/api-secret HTML. ' +
                'The page format may have changed, or the signup session cookie was not preserved.'
        );
    }

    return { tenantId, apiKey, email };
}

function extractApiKey(html: string): string | null {
    // The page renders an <input> with the key. Match a long uppercase/digit token.
    const m = html.match(/value="([A-Z0-9]{16,})"/);
    return m ? m[1] : null;
}

/**
 * Best-effort cleanup. Safe to call multiple times.
 */
export async function destroyTenant(tenant: TestTenant | undefined | null): Promise<void> {
    if (!tenant) return;
    await deleteTenantByEmail(tenant.email);
}
