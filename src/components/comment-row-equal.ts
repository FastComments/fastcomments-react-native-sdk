import type { CommentViewProps } from './comment';

export function threadLinesEqual(a?: readonly string[], b?: readonly string[]): boolean {
    if (a === b) return true;
    if (!a || !b || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/**
 * `React.memo` comparator for a comment row. Each row self-subscribes to its own
 * comment (`byId[_id]`) for content, so a vote/edit on ONE comment re-renders
 * only that row through its subscription. Returning `true` here (skip re-render)
 * for everything except layout-affecting inputs stops an unrelated store change
 * (e.g. voting another comment) from re-rendering every row - which would re-run
 * react-native-render-html and visibly reload/flash images in other comments.
 *
 * Content is intentionally NOT compared: it does not arrive through these props,
 * it arrives through the per-row store subscription.
 */
export function commentRowPropsAreEqual(prev: CommentViewProps, next: CommentViewProps): boolean {
    return (
        prev.comment._id === next.comment._id &&
        prev.comment.depth === next.comment.depth &&
        threadLinesEqual(prev.comment.threadLines, next.comment.threadLines) &&
        prev.width === next.width &&
        prev.styles === next.styles &&
        prev.config === next.config &&
        prev.imageAssets === next.imageAssets &&
        prev.translations === next.translations &&
        prev.store === next.store
    );
}
