import type { FastCommentsSessionUser } from '../types/user';

interface IdentityFields {
    username?: string;
    email?: string;
    isAnonSession?: boolean;
}

function identityOf(user: FastCommentsSessionUser): IdentityFields {
    const fields: IdentityFields = {};
    if (user && typeof user === 'object') {
        if ('username' in user && typeof user.username === 'string') fields.username = user.username;
        if ('email' in user && typeof user.email === 'string') fields.email = user.email;
        if ('isAnonSession' in user && typeof user.isAnonSession === 'boolean') fields.isAnonSession = user.isAnonSession;
    }
    return fields;
}

/**
 * Whether the user has a visible identity (a username). A fresh guest cookie
 * materializes an anon-session user with no username/email; that ghost user
 * must not light up logged-in chrome (top bar, logout, notifications).
 */
export function isIdentifiedUser(user: FastCommentsSessionUser): boolean {
    const identity = identityOf(user);
    return !!identity.username && identity.username.length > 0;
}

/**
 * Whether an action (e.g. voting) needs to collect identity first. Anon
 * sessions count as authenticated only once they carry a username or email,
 * unless the tenant allows fully anonymous actions.
 */
export function userNeedsAuthToAct(user: FastCommentsSessionUser, allowAnon: boolean): boolean {
    if (!user) return true;
    if (allowAnon) return false;
    const identity = identityOf(user);
    if (identity.isAnonSession && !identity.username && !identity.email) return true;
    return false;
}
