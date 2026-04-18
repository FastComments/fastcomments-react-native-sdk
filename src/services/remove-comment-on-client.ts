import { decOverallCommentCount } from './comment-count';
import type { FastCommentsStore } from '../store/types';

export function removeCommentOnClient(store: FastCommentsStore, commentId: string) {
    const state = store.getState();
    const comment = state.byId[commentId];
    const parentId = comment?.parentId;
    state.removeComment(commentId);
    decOverallCommentCount(state.config.countAll, store, parentId);
}
