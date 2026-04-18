import { makeComment, makeTestStore } from '../../__tests__/test-helpers';
import {
    computeVisibleList,
    createVisibleListSelector,
} from '../visible-list';

describe('computeVisibleList', () => {
    it('emits entries in tree order with correct depths', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
                makeComment({ _id: 'grand1', parentId: 'child1' }),
                makeComment({ _id: 'root2' }),
            ],
            false
        );
        const result = computeVisibleList(store.getState());
        expect(result).toEqual([
            { id: 'root1', depth: 0 },
            { id: 'child1', depth: 1 },
            { id: 'grand1', depth: 2 },
            { id: 'root2', depth: 0 },
        ]);
    });

    it('hides collapsed subtrees', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [
                makeComment({ _id: 'root1' }),
                makeComment({ _id: 'child1', parentId: 'root1' }),
            ],
            true
        );
        const result = computeVisibleList(store.getState());
        expect(result).toEqual([{ id: 'root1', depth: 0 }]);

        store.getState().setRepliesHidden('root1', false);
        const result2 = computeVisibleList(store.getState());
        expect(result2).toEqual([
            { id: 'root1', depth: 0 },
            { id: 'child1', depth: 1 },
        ]);
    });
});

describe('createVisibleListSelector memoization', () => {
    it('returns the same reference when inputs are unchanged', () => {
        const store = makeTestStore();
        store.getState().replaceAll(
            [makeComment({ _id: 'r1' }), makeComment({ _id: 'c1', parentId: 'r1' })],
            false
        );
        const sel = createVisibleListSelector();
        const first = sel(store.getState());
        const second = sel(store.getState());
        expect(second).toBe(first);
    });

    it('recomputes when state mutates', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1' })], false);
        const sel = createVisibleListSelector();
        const first = sel(store.getState());
        store.getState().upsertComment(makeComment({ _id: 'r2' }), true);
        const second = sel(store.getState());
        expect(second).not.toBe(first);
        expect(second.map((e) => e.id)).toEqual(['r1', 'r2']);
    });

    it('does not recompute when an unrelated slice (config) changes', () => {
        const store = makeTestStore();
        store.getState().replaceAll([makeComment({ _id: 'r1' })], false);
        const sel = createVisibleListSelector();
        const first = sel(store.getState());
        store.getState().setIsSiteAdmin(true);
        const second = sel(store.getState());
        expect(second).toBe(first);
    });
});
