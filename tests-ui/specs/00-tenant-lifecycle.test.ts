/**
 * Framework smoke test: verifies we can create and destroy a test tenant
 * end-to-end against the real FastComments backend, and that the scraped API
 * key is plausible (uppercase alnum, length > 16).
 *
 * Skipped if FC_E2E_API_KEY is not set so contributors can run unit-only suites.
 */
import { createTestTenant, destroyTenant, fetchTenantByEmail } from '../framework/api/tenant';
import { seedComment } from '../framework/api/comments-rest';
import { makeSecureSSOToken, buildTestUser } from '../framework/api/sso';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

maybe('tenant lifecycle (real network)', () => {
    it('creates and deletes a tenant', async () => {
        const stamp = Date.now().toString(36);
        const email = `rn-lifecycle-${stamp}@fctest.com`;
        const tenant = await createTestTenant(email);
        try {
            expect(tenant.tenantId).toMatch(/^[A-Za-z0-9_-]+$/);
            expect(tenant.apiKey).toMatch(/^[A-Z0-9]{16,}$/);
            const found = await fetchTenantByEmail(email);
            expect(found?._id).toBe(tenant.tenantId);
        } finally {
            await destroyTenant(tenant);
        }
        const afterDelete = await fetchTenantByEmail(email);
        expect(afterDelete).toBeNull();
    });

    it('seeds a comment as an SSO user', async () => {
        const stamp = Date.now().toString(36);
        const email = `rn-seed-${stamp}@fctest.com`;
        const tenant = await createTestTenant(email);
        try {
            const ssoToken = makeSecureSSOToken(tenant.apiKey, buildTestUser('alice'));
            const id = await seedComment({
                tenant,
                urlId: `seed-test-${stamp}`,
                text: 'Hello from RN test framework',
                ssoToken,
            });
            expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
            expect(id.length).toBeGreaterThan(8);
        } finally {
            await destroyTenant(tenant);
        }
    }, 90000);
});
