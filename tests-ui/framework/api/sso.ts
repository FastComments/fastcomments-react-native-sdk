import * as crypto from 'crypto';

export interface SSOUserInfo {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    isAdmin?: boolean;
    isModerator?: boolean;
    displayName?: string;
}

export interface SSOPayload {
    userDataJSONBase64: string;
    verificationHash: string;
    timestamp: number;
}

/**
 * Build a Secure SSO payload. Mirrors what `SecureSSOUserData.prepareToSend()`
 * returns on the Android SDK and what `getSSOIframeSrcForUser` produces in the
 * Playwright e2e suite. The HMAC input is `timestamp + userDataJSONBase64` (no
 * separator), HMAC-SHA256 with the tenant API key as secret.
 */
export function makeSecureSSOPayload(apiKey: string, user: SSOUserInfo): SSOPayload {
    const userData: Record<string, unknown> = {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar ?? '',
    };
    if (user.isAdmin) userData.isAdmin = true;
    if (user.isModerator) userData.isModerator = true;
    if (user.displayName) userData.displayName = user.displayName;

    const userDataJSON = JSON.stringify(userData);
    const userDataJSONBase64 = Buffer.from(userDataJSON, 'utf8').toString('base64');
    const timestamp = Date.now();
    const verificationHash = crypto
        .createHmac('sha256', apiKey)
        .update(timestamp + userDataJSONBase64, 'utf8')
        .digest('hex');

    return { userDataJSONBase64, verificationHash, timestamp };
}

/**
 * Returns a JSON string suitable for the `sso=` query param. The SDK accepts
 * the same shape via `config.sso`, so callers that pass to the SDK can also
 * just pass `makeSecureSSOPayload(...)`.
 */
export function makeSecureSSOToken(apiKey: string, user: SSOUserInfo): string {
    return JSON.stringify(makeSecureSSOPayload(apiKey, user));
}

/**
 * Produces a typical user object used by the Android instrumentation tests.
 * Email is `tester-{userId}@fctest.com`, username `Tester {userId}`. Admins get
 * `isAdmin: true`.
 */
export function buildTestUser(userId: string, opts?: { isAdmin?: boolean }): SSOUserInfo {
    return {
        id: userId,
        email: `tester-${userId}@fctest.com`,
        username: `Tester ${userId}`,
        avatar: '',
        isAdmin: !!opts?.isAdmin,
    };
}
