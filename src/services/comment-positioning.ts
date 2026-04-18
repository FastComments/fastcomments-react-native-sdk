import { FastCommentsCommentPositions } from '../types';
import type { FastCommentsStore } from '../store/types';

export function repositionComment(
    id: string,
    commentPositions: FastCommentsCommentPositions,
    store: FastCommentsStore
) {
    const state = store.getState();
    const direction = state.sortDirection ?? 'MR';
    const positions = commentPositions[direction];
    if (!positions) return;
    // Only reposition roots: child ordering follows insertion order in childrenByParent.
    const comment = state.byId[id];
    if (!comment || comment.parentId) return;
    state.repositionRoot(id, positions.before ?? undefined, positions.after ?? undefined);
}
