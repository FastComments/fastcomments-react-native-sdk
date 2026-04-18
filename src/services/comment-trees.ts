import { FastCommentsWidgetComment } from 'fastcomments-typescript';
import { RNComment } from '../types';
import type { FastCommentsStore } from '../store/types';

/**
 * Pure normalizer used by non-store code (tests, external callers).
 * Returns a (tree, byId) view of the raw comment list with nestedChildrenCount filled in.
 *
 * The live store uses its own normalizer (CommentsSlice.replaceAll) which builds the flat
 * Map + edges shape directly. This function is preserved as a backwards compatible helper
 * for any consumer that just wants the old shape without driving the store.
 */
export function getCommentsTreeAndCommentsById(collapseRepliesByDefault: boolean, rawComments: RNComment[]) {
    const commentsById: Record<string, FastCommentsWidgetComment> = {};
    const commentsLength = rawComments.length;
    const resultComments: FastCommentsWidgetComment[] = [];

    for (let i = 0; i < commentsLength; i++) {
        commentsById[rawComments[i]._id] = rawComments[i];
    }

    for (let i = 0; i < commentsLength; i++) {
        const comment = rawComments[i];
        comment.nestedChildrenCount = 0;
        if (collapseRepliesByDefault && (!comment.parentId || !commentsById[comment.parentId!]) && comment.repliesHidden === undefined) {
            comment.repliesHidden = true;
        }
        const parentId = comment.parentId;
        if (parentId && commentsById[parentId]) {
            const parent = commentsById[parentId];
            if (!parent.children) {
                parent.children = [comment];
            } else {
                parent.children.push(comment);
            }
            let cursorId: string | null | undefined = parentId;
            let guard = 0;
            while (cursorId && guard < 10000) {
                guard++;
                const cursor: FastCommentsWidgetComment | undefined = commentsById[cursorId];
                if (!cursor) break;
                cursor.nestedChildrenCount = (cursor.nestedChildrenCount ?? 0) + 1;
                cursorId = cursor.parentId;
            }
        } else {
            resultComments.push(comment);
        }
    }

    return {
        comments: resultComments,
        commentsById,
    };
}

export function ensureRepliesOpenToComment(store: FastCommentsStore, commentId: string) {
    store.getState().ensureRepliesOpenTo(commentId);
}

export function iterateCommentsTree(
    nodes: FastCommentsWidgetComment[],
    cb: (comment: FastCommentsWidgetComment) => boolean | 'delete' | undefined | void
) {
    for (const comment of nodes) {
        const result = cb(comment);
        if (result === false) break;
        if (comment.children) iterateCommentsTree(comment.children, cb);
    }
}

export function iterateCommentsTreeWithDepth(
    nodes: RNComment[],
    depth: number,
    cb: (comment: RNComment, depth: number) => boolean | 'delete' | undefined | void
) {
    for (const comment of nodes) {
        const result = cb(comment, depth);
        if (result === false) break;
        if (comment.children) iterateCommentsTreeWithDepth(comment.children, depth + 1, cb);
    }
}
