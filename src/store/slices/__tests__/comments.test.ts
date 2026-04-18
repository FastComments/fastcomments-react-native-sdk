import type { FastCommentsBadge } from 'fastcomments-typescript';
import { makeComment, makeFixture, makeTestStore } from '../../__tests__/test-helpers';

describe('CommentsSlice.replaceAll', () => {
    it('builds byId, childrenByParent, rootOrder, and nested counts', () => {
        const store = makeTestStore();
        const comments = [
            makeComment({ _id: 'root1' }),
            makeComment({ _id: 'child1', parentId: 'root1' }),
            makeComment({ _id: 'child2', parentId: 'root1' }),
            makeComment({ _id: 'grand1', parentId: 'child1' }),
            makeComment({ _id: 'root2' }),
        ];

        store.getState().replaceAll(comments, false);

        const s = store.getState();
        expect(Object.keys(s.byId).sort()).toEqual(
            ['child1', 'child2', 'grand1', 'root1', 'root2']
        );
        expect(s.rootOrder).toEqual(['root1', 'root2']);
        expect(s.childrenByParent['root1']).toEqual(['child1', 'child2']);
        expect(s.childrenByParent['child1']).toEqual(['grand1']);
        expect(s.nestedCountById['root1']).toBe(3);
        expect(s.nestedCountById['child1']).toBe(1);
        expect(s.nestedCountById['child2']).toBeUndefined();
        expect(s.commentCountOnClient).toBe(5);
    });

    it('collapses root replies when collapseRepliesByDefault is true', () => {
        const store = makeTestStore();
        const comments = [
            makeComment({ _id: 'r1' }),
            makeComment({ _id: 'c1', parentId: 'r1' }),
        ];
        store.getState().replaceAll(comments, true);
        expect(store.getState().byId['r1'].repliesHidden).toBe(true);
        expect(store.getState().byId['c1'].repliesHidden).toBeUndefined();
    });

    it('indexes comments by userId', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'a', userId: 'u1' }),
                makeComment({ _id: 'b', userId: 'u1' }),
                makeComment({ _id: 'c', userId: 'u2' }),
            ],
            false
        );
        const idx = store.getState().commentsByUserId;
        expect(Array.from(idx['u1']).sort()).toEqual(['a', 'b']);
        expect(Array.from(idx['u2'])).toEqual(['c']);
    });

    it('records pinned root comments', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'p1', isPinned: true }),
                makeComment({ _id: 'r1' }),
            ],
            false
        );
        expect(store.getState().pinnedIds.has('p1')).toBe(true);
        expect(store.getState().pinnedIds.has('r1')).toBe(false);
    });
});

describe('CommentsSlice.upsertComment', () => {
    it('prepends a new root when newCommentsToBottom=false', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1' })], false);
        store.getState().upsertComment(makeComment({ _id: 'r2' }), false);
        expect(store.getState().rootOrder).toEqual(['r2', 'r1']);
    });

    it('appends when newCommentsToBottom=true', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1' })], false);
        store.getState().upsertComment(makeComment({ _id: 'r2' }), true);
        expect(store.getState().rootOrder).toEqual(['r1', 'r2']);
    });

    it('keeps pinned roots at the front', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'p1', isPinned: true }),
                makeComment({ _id: 'r1' }),
            ],
            false
        );
        store.getState().upsertComment(makeComment({ _id: 'r2' }), false);
        // New non-pinned root should land after p1, not before.
        expect(store.getState().rootOrder).toEqual(['p1', 'r2', 'r1']);
    });

    it('inserts pinned comment at the head of the pinned section', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'p1', isPinned: true }),
                makeComment({ _id: 'r1' }),
                makeComment({ _id: 'r2' }),
            ],
            false
        );
        store.getState().upsertComment(
            makeComment({ _id: 'p2', isPinned: true }),
            false
        );
        expect(store.getState().rootOrder.slice(0, 2).sort()).toEqual(['p1', 'p2']);
        expect(store.getState().pinnedIds.has('p2')).toBe(true);
        // r1, r2 must remain after pinned section.
        expect(store.getState().rootOrder.slice(2)).toEqual(['r1', 'r2']);
    });

    it('appends a child to an existing parent and bumps ancestor nested counts', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
            ],
            false
        );
        store.getState().upsertComment(
            makeComment({ _id: 'grand1', parentId: 'child1' }),
            true
        );
        expect(store.getState().childrenByParent['child1']).toEqual(['grand1']);
        expect(store.getState().nestedCountById['root1']).toBe(2);
        expect(store.getState().nestedCountById['child1']).toBe(1);
    });

    it('skips insertion when parent is unknown', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1' })], false);
        store.getState().upsertComment(
            makeComment({ _id: 'orphan', parentId: 'not-here' }),
            true
        );
        expect(store.getState().byId['orphan']).toBeUndefined();
    });

    it('merges updates when called with an existing id', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1', comment: 'old' })], false);
        store.getState().upsertComment(makeComment({ _id: 'r1', comment: 'new' }), false);
        expect(store.getState().byId['r1'].comment).toBe('new');
        expect(store.getState().rootOrder).toEqual(['r1']);
    });
});

describe('CommentsSlice.removeComment', () => {
    it('removes a leaf and decrements ancestor counts', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
                makeComment({ _id: 'grand1', parentId: 'child1' }),
            ],
            false
        );
        store.getState().removeComment('grand1');
        expect(store.getState().byId['grand1']).toBeUndefined();
        expect(store.getState().childrenByParent['child1']).toBeUndefined();
        expect(store.getState().nestedCountById['root1']).toBe(1);
        expect(store.getState().nestedCountById['child1']).toBe(0);
    });

    it('removes an entire subtree when a parent is removed', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
                makeComment({ _id: 'grand1', parentId: 'child1' }),
                makeComment({ _id: 'grand2', parentId: 'child1' }),
            ],
            false
        );
        store.getState().removeComment('child1');
        expect(store.getState().byId['grand1']).toBeUndefined();
        expect(store.getState().byId['grand2']).toBeUndefined();
        expect(store.getState().childrenByParent['root1']).toBeUndefined();
        expect(store.getState().nestedCountById['root1']).toBe(0);
    });

    it('drops root from rootOrder and pinnedIds', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'p1', isPinned: true }),
                makeComment({ _id: 'r1' }),
            ],
            false
        );
        store.getState().removeComment('p1');
        expect(store.getState().rootOrder).toEqual(['r1']);
        expect(store.getState().pinnedIds.has('p1')).toBe(false);
    });
});

describe('CommentsSlice.applyVote / applyBadge', () => {
    it('updates vote tallies in place', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [makeComment({ _id: 'r1', votes: 0, votesUp: 0, votesDown: 0 })],
            false
        );
        store.getState().applyVote('r1', 3, 4, 1);
        const c = store.getState().byId['r1'];
        expect(c.votes).toBe(3);
        expect(c.votesUp).toBe(4);
        expect(c.votesDown).toBe(1);
    });

    it('applyBadge adds and skips duplicates', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'a', userId: 'u1' }),
                makeComment({ _id: 'b', userId: 'u1' }),
                makeComment({ _id: 'c', userId: 'u2' }),
            ],
            false
        );
        const badge: FastCommentsBadge = {
            id: 'badge-1',
            backgroundColor: '#fff',
            borderColor: '#000',
            cssClass: '',
            description: '',
            displayLabel: 'X',
            displaySrc: '',
            textColor: '#000',
            type: 0,
        };
        store.getState().applyBadge('u1', badge, false);
        expect(store.getState().byId['a'].badges).toEqual([badge]);
        expect(store.getState().byId['b'].badges).toEqual([badge]);
        expect(store.getState().byId['c'].badges).toBeUndefined();

        // Idempotent
        store.getState().applyBadge('u1', badge, false);
        expect(store.getState().byId['a'].badges).toEqual([badge]);

        // Remove
        store.getState().applyBadge('u1', badge, true);
        expect(store.getState().byId['a'].badges).toEqual([]);
    });
});

describe('CommentsSlice.ensureRepliesOpenTo', () => {
    it('unhides the entire ancestor chain', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
                makeComment({ _id: 'grand1', parentId: 'child1' }),
            ],
            true
        );
        expect(store.getState().byId['root1'].repliesHidden).toBe(true);

        store.getState().ensureRepliesOpenTo('grand1');
        expect(store.getState().byId['root1'].repliesHidden).toBe(false);
        // child1 had no repliesHidden set (only roots collapse by default) — should also be false.
        expect(store.getState().byId['child1'].repliesHidden).toBe(false);
    });
});

describe('CommentsSlice at scale', () => {
    it('handles 5000 comments without crashing and preserves counts', () => {
        const store = makeTestStore();
        const fixture = makeFixture(5000, { branch: 8 });
        store.getState().replaceAll(fixture, false);
        const s = store.getState();
        expect(Object.keys(s.byId).length).toBe(5000);
        expect(s.commentCountOnClient).toBe(5000);
        // Root (c0) should have nested count of 4999 (whole tree minus itself).
        expect(s.nestedCountById['c0']).toBe(4999);
    });
});
