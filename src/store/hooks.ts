import { useStore as useZustandStore } from 'zustand';
import type { FastCommentsStore, FastCommentsStoreState } from './types';

export function useStoreValue<U>(store: FastCommentsStore, selector: (s: FastCommentsStoreState) => U): U {
    return useZustandStore(store, selector);
}

export function useComment(store: FastCommentsStore, id: string) {
    return useZustandStore(store, (s) => s.byId[id]);
}

export function useChildIds(store: FastCommentsStore, parentId: string): string[] | undefined {
    return useZustandStore(store, (s) => s.childrenByParent[parentId]);
}
