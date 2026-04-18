import type { FastCommentsStore } from '../store/types';

export function incOverallCommentCount(
    countAll: boolean | undefined,
    store: FastCommentsStore,
    parentId: string | null | undefined
) {
    if (!parentId || (parentId && countAll)) {
        store.getState().incCommentCountOnServer(1);
    }
}

export function decOverallCommentCount(
    countAll: boolean | undefined,
    store: FastCommentsStore,
    parentId: string | null | undefined
) {
    if (!parentId || (parentId && countAll)) {
        store.getState().incCommentCountOnServer(-1);
    }
}
