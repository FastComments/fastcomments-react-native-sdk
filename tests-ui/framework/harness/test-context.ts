import { destroyTenant, createTestTenant, TestTenant } from '../api/tenant';
import { buildTestUser, makeSecureSSOToken, SSOUserInfo } from '../api/sso';
import { TestSyncCoordinator } from './sync';

export interface TestContext {
    tenant: TestTenant;
    sync: TestSyncCoordinator;
    /**
     * Random urlId scoped to this test, namespaced with the test name to make
     * server-side debugging easier.
     */
    urlId: string;
    /**
     * Build an SSO token for a user belonging to this tenant. Use distinct
     * `userId` values per logical user (e.g. 'userA', 'userB', 'admin').
     */
    ssoFor(userId: string, opts?: { isAdmin?: boolean; user?: Partial<SSOUserInfo> }): string;
    cleanupHandlers: Array<() => Promise<void> | void>;
    onTeardown(fn: () => Promise<void> | void): void;
}

export interface SetupOptions {
    /**
     * Email for the test tenant. Must end in @fctest.com. We append a random
     * suffix to keep concurrent test runs from colliding.
     */
    emailPrefix: string;
    /**
     * Slug used in the urlId. Prefer the test name.
     */
    urlIdLabel: string;
}

export async function setupTestContext(opts: SetupOptions): Promise<TestContext> {
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const email = `rn-${opts.emailPrefix}-${stamp}@fctest.com`;
    const tenant = await createTestTenant(email);
    const urlId = `rn-${opts.urlIdLabel}-${stamp}`;
    const sync = new TestSyncCoordinator();
    const cleanupHandlers: Array<() => Promise<void> | void> = [];
    return {
        tenant,
        sync,
        urlId,
        cleanupHandlers,
        onTeardown(fn) {
            cleanupHandlers.push(fn);
        },
        ssoFor(userId, opts2) {
            const user = { ...buildTestUser(userId, { isAdmin: !!opts2?.isAdmin }), ...(opts2?.user || {}) };
            // When isAdmin is set, the server only honors the flag if the SSO
            // user matches an existing tenant User by email. The tenant signup
            // creates exactly one such user (the account owner) with the email
            // we passed in. Reuse that email so the new SSO user inherits
            // `isAccountOwner: true`, which is what `userHasAdminOrModerationFlags`
            // actually checks during pin/lock authorization.
            if (opts2?.isAdmin) {
                user.email = email;
            }
            return makeSecureSSOToken(tenant.apiKey, user);
        },
    };
}

export async function teardownTestContext(ctx: TestContext | undefined): Promise<void> {
    if (!ctx) return;
    for (const fn of [...ctx.cleanupHandlers].reverse()) {
        try {
            await fn();
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('teardown handler failed:', (e as Error).message);
        }
    }
    await destroyTenant(ctx.tenant);
}
