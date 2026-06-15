import { commentRowPropsAreEqual, threadLinesEqual } from '../comment-row-equal';
import type { CommentViewProps } from '../comment';

// Stable references shared by prev/next (theming/config/store are memoized in
// real usage, so the comparator treats them by identity).
const styles = {} as CommentViewProps['styles'];
const config = {} as CommentViewProps['config'];
const imageAssets = {} as CommentViewProps['imageAssets'];
const translations = {} as CommentViewProps['translations'];
const store = {} as CommentViewProps['store'];

function makeProps(over: { comment?: Record<string, unknown>; width?: number; styles?: unknown }): CommentViewProps {
    return {
        comment: { _id: 'c1', depth: 1, threadLines: ['line'], ...over.comment },
        width: over.width ?? 360,
        styles: (over.styles as CommentViewProps['styles']) ?? styles,
        config,
        imageAssets,
        translations,
        store,
    } as unknown as CommentViewProps;
}

describe('commentRowPropsAreEqual', () => {
    it('treats a content-only change (e.g. a vote) as equal so the row does NOT re-render', () => {
        // The regression: voting another comment must not flash this row's image.
        const prev = makeProps({ comment: { votes: 0, votesUp: 0, commentHTML: '<img src="x">' } });
        const next = makeProps({ comment: { votes: 5, votesUp: 5, commentHTML: '<img src="x">' } });
        expect(commentRowPropsAreEqual(prev, next)).toBe(true);
    });

    it('re-renders when layout inputs change', () => {
        const base = makeProps({});
        expect(commentRowPropsAreEqual(base, makeProps({ comment: { _id: 'c2' } }))).toBe(false);
        expect(commentRowPropsAreEqual(base, makeProps({ comment: { depth: 2 } }))).toBe(false);
        expect(commentRowPropsAreEqual(base, makeProps({ comment: { threadLines: ['tee'] } }))).toBe(false);
        expect(commentRowPropsAreEqual(base, makeProps({ width: 500 }))).toBe(false);
        expect(commentRowPropsAreEqual(base, makeProps({ styles: {} }))).toBe(false);
    });
});

describe('threadLinesEqual', () => {
    it('compares slot arrays by value', () => {
        expect(threadLinesEqual(['line', 'tee'], ['line', 'tee'])).toBe(true);
        expect(threadLinesEqual(['line'], ['tee'])).toBe(false);
        expect(threadLinesEqual(['line'], ['line', 'tee'])).toBe(false);
        expect(threadLinesEqual(undefined, undefined)).toBe(true);
        expect(threadLinesEqual(undefined, ['line'])).toBe(false);
    });
});
