import { makeSecureSSOPayload, buildTestUser } from '../framework/api/sso';
import { TestSyncCoordinator } from '../framework/harness/sync';

describe('smoke', () => {
    it('builds a valid SSO payload with timestamp + base64 HMAC', () => {
        const user = buildTestUser('alice');
        const payload = makeSecureSSOPayload('test-key', user);
        expect(payload.userDataJSONBase64).toBeTruthy();
        expect(payload.verificationHash).toMatch(/^[0-9a-f]{64}$/);
        expect(payload.timestamp).toBeGreaterThan(1_000_000_000_000);
        const decoded = JSON.parse(Buffer.from(payload.userDataJSONBase64, 'base64').toString('utf8'));
        expect(decoded.id).toBe('alice');
        expect(decoded.email).toBe('tester-alice@fctest.com');
        expect(decoded.username).toBe('Tester alice');
    });

    it('signals ready / waits between two roles via in-process sync', async () => {
        const sync = new TestSyncCoordinator();
        const wait = sync.waitFor('userA', 'phase1', 1000);
        sync.signalReady('userA', 'phase1');
        await expect(wait).resolves.toBeUndefined();
    });

    it('round-trips data between roles via the sync coordinator', async () => {
        const sync = new TestSyncCoordinator();
        const dataPromise = sync.awaitData<{ commentId: string }>('phase2_setup', 1000);
        sync.postData('phase2_setup', { commentId: 'abc123' });
        await expect(dataPromise).resolves.toEqual({ commentId: 'abc123' });
    });
});
