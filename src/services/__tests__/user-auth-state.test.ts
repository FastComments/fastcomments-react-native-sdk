import { isIdentifiedUser, userNeedsAuthToAct } from '../user-auth-state';
import type { FastCommentsSessionUser } from '../../types/user';

const loggedIn: FastCommentsSessionUser = {
    id: 'u1',
    username: 'tester',
    authorized: true,
    avatarSrc: null,
    hasBlockedUsers: false,
};

const anonWithIdentity: FastCommentsSessionUser = {
    isAnonSession: true,
    id: 'anon:1',
    username: 'GuestTester',
    email: 'guest@fctest.com',
    authorized: true,
    avatarSrc: null,
    hasBlockedUsers: false,
};

// The wire shape a fresh guest session cookie produces: anon session with no
// username/email. Must NOT be treated as an authenticated, identified user.
const ghostAnon = {
    isAnonSession: true,
    id: 'anon:2',
    username: '',
    authorized: true,
    avatarSrc: null,
    hasBlockedUsers: false,
};

describe('userNeedsAuthToAct', () => {
    it('requires auth when there is no user', () => {
        expect(userNeedsAuthToAct(null, false)).toBe(true);
        expect(userNeedsAuthToAct(undefined, false)).toBe(true);
    });

    it('does not require auth for a logged-in user', () => {
        expect(userNeedsAuthToAct(loggedIn, false)).toBe(false);
    });

    it('does not require auth for an anon session that has an identity', () => {
        expect(userNeedsAuthToAct(anonWithIdentity, false)).toBe(false);
    });

    it('requires auth for a ghost anon session (no username/email)', () => {
        expect(userNeedsAuthToAct(ghostAnon, false)).toBe(true);
    });

    it('allows a ghost anon session when anonymous actions are allowed', () => {
        expect(userNeedsAuthToAct(ghostAnon, true)).toBe(false);
    });
});

describe('isIdentifiedUser', () => {
    it('is false for missing users and ghost anon sessions', () => {
        expect(isIdentifiedUser(null)).toBe(false);
        expect(isIdentifiedUser(undefined)).toBe(false);
        expect(isIdentifiedUser(ghostAnon)).toBe(false);
    });

    it('is true for users with a username', () => {
        expect(isIdentifiedUser(loggedIn)).toBe(true);
        expect(isIdentifiedUser(anonWithIdentity)).toBe(true);
    });
});
