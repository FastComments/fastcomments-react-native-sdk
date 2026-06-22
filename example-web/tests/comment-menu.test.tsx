/**
 * Web-lane unit tests for getCommentMenuState gating (it lives in a component
 * file, so it runs in the react-native-web lane). Verifies the lock/gating
 * parity rules.
 */
import { describe, it, expect } from 'vitest';
import { getCommentMenuItems, getCommentMenuState } from '../../src/components/comment-menu';
import { FastCommentsLiveCommentingService } from '../../src/services/fastcomments-live-commenting';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import type { FastCommentsRNConfig } from '../../src/types/react-native-config';
import type { RNComment } from '../../src/types/react-native-comment';

function makeStore(extraConfig: Partial<FastCommentsRNConfig> = {}) {
    return FastCommentsLiveCommentingService.createStoreFromConfig({
        tenantId: 'demo',
        urlId: 'menu-test',
        apiHost: 'https://fastcomments.com',
        ...extraConfig,
    } as FastCommentsRNConfig);
}

function asComment(c: Partial<RNComment>): RNComment {
    return { _id: 'c1', tenantId: 'demo', ...c } as RNComment;
}

const user = (id: string) => ({ id, authorized: true }) as never;

describe('getCommentMenuState', () => {
    it("another user's comment: can flag + block, not edit/delete/pin/lock", () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('viewer'));
        expect(getCommentMenuState(store, asComment({ userId: 'author' }))).toMatchObject({
            canEdit: false,
            canDelete: false,
            canPin: false,
            canLock: false,
            canBlock: true,
            canFlag: true,
        });
    });

    it('own comment: edit + delete, not block/flag', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('me'));
        expect(getCommentMenuState(store, asComment({ userId: 'me' }))).toMatchObject({
            canEdit: true,
            canDelete: true,
            canBlock: false,
            canFlag: false,
        });
    });

    it('locked comment: a non-admin owner cannot edit or delete it', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('me'));
        const s = getCommentMenuState(store, asComment({ userId: 'me', isLocked: true }));
        expect(s.canEdit).toBe(false);
        expect(s.canDelete).toBe(false);
    });

    it('admin: can lock; can edit a locked comment but not delete it', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        const s = getCommentMenuState(store, asComment({ userId: 'author', isLocked: true }));
        expect(s.canLock).toBe(true);
        expect(s.canEdit).toBe(true);
        expect(s.canDelete).toBe(false);
    });

    it('admin can pin only root comments', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        expect(getCommentMenuState(store, asComment({ userId: 'a' })).canPin).toBe(true);
        expect(getCommentMenuState(store, asComment({ userId: 'a', parentId: 'p' })).canPin).toBe(false);
    });

    it('disableBlocking hides block but keeps flag', () => {
        const store = makeStore({ disableBlocking: true });
        store.getState().setCurrentUser(user('viewer'));
        const s = getCommentMenuState(store, asComment({ userId: 'author' }));
        expect(s.canBlock).toBe(false);
        expect(s.canFlag).toBe(true);
    });

    it('only an admin can lock', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('viewer'));
        expect(getCommentMenuState(store, asComment({ userId: 'author' })).canLock).toBe(false);
    });

    it('getCommentMenuItems emits a lock item for an admin (unlock when locked)', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        const styles = getDefaultFastCommentsStyles();
        const comment = asComment({ userId: 'author' });
        const open = getCommentMenuItems({ comment, store, styles }, getCommentMenuState(store, comment));
        expect(open.map((i) => i.id)).toContain('lock');

        const locked = asComment({ userId: 'author', isLocked: true });
        const lockedItems = getCommentMenuItems({ comment: locked, store, styles }, getCommentMenuState(store, locked));
        expect(lockedItems.map((i) => i.id)).toContain('unlock');
    });
});

describe('getCommentMenuState (moderation actions)', () => {
    it('admin gets approve/spam/ban/view-by-IP on another user comment', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        expect(getCommentMenuState(store, asComment({ userId: 'author' }))).toMatchObject({
            canApprove: true,
            canMarkSpam: true,
            canBan: true,
            canViewByIP: true,
        });
    });

    it('non-admin gets no moderation actions', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('viewer'));
        expect(getCommentMenuState(store, asComment({ userId: 'author' }))).toMatchObject({
            canApprove: false,
            canMarkSpam: false,
            canBan: false,
            canGiveBadge: false,
            canRemoveBadge: false,
            canViewByIP: false,
        });
    });

    it('admin cannot ban their own comment', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        expect(getCommentMenuState(store, asComment({ userId: 'admin' })).canBan).toBe(false);
    });

    it('give badge requires a registered user; remove badge also requires existing badges', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);

        // anon comment (no userId): no badge actions
        const anon = getCommentMenuState(store, asComment({ anonUserId: 'anon1' }));
        expect(anon.canGiveBadge).toBe(false);
        expect(anon.canRemoveBadge).toBe(false);

        // registered user, no badges: can give, cannot remove
        const noBadges = getCommentMenuState(store, asComment({ userId: 'author' }));
        expect(noBadges.canGiveBadge).toBe(true);
        expect(noBadges.canRemoveBadge).toBe(false);

        // registered user with badges: can give and remove
        const withBadges = getCommentMenuState(store, asComment({ userId: 'author', badges: [{ id: 'b1' } as never] }));
        expect(withBadges.canGiveBadge).toBe(true);
        expect(withBadges.canRemoveBadge).toBe(true);
    });

    it('getCommentMenuItems emits the moderation items for an admin', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('admin'));
        store.getState().setIsSiteAdmin(true);
        const styles = getDefaultFastCommentsStyles();

        // approved=false -> "approve"; not spam -> "spam"; has a userId+badges -> both badge items
        const comment = asComment({ userId: 'author', approved: false, badges: [{ id: 'b1' } as never] });
        const ids = getCommentMenuItems({ comment, store, styles }, getCommentMenuState(store, comment)).map((i) => i.id);
        expect(ids).toEqual(expect.arrayContaining(['approve', 'spam', 'ban', 'give-badge', 'remove-badge', 'view-by-ip']));

        // approved (true) + already spam -> the inverse toggle ids
        const moderated = asComment({ userId: 'author', approved: true, isSpam: true });
        const moderatedIds = getCommentMenuItems({ comment: moderated, store, styles }, getCommentMenuState(store, moderated)).map(
            (i) => i.id
        );
        expect(moderatedIds).toEqual(expect.arrayContaining(['unapprove', 'not-spam']));
    });

    it('a non-admin viewer gets no moderation menu items', () => {
        const store = makeStore();
        store.getState().setCurrentUser(user('viewer'));
        const styles = getDefaultFastCommentsStyles();
        const comment = asComment({ userId: 'author' });
        const ids = getCommentMenuItems({ comment, store, styles }, getCommentMenuState(store, comment)).map((i) => i.id);
        for (const modId of ['approve', 'unapprove', 'spam', 'not-spam', 'ban', 'give-badge', 'remove-badge', 'view-by-ip']) {
            expect(ids).not.toContain(modId);
        }
    });
});
