import type { RNComment } from '../../types/react-native-comment';
import type { FastCommentsStoreState } from '../types';

export const selectCommentById =
    (id: string) =>
    (state: FastCommentsStoreState): RNComment | undefined =>
        state.byId[id];

export const selectChildrenIds =
    (parentId: string) =>
    (state: FastCommentsStoreState): string[] | undefined =>
        state.childrenByParent[parentId];
