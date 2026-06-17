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
