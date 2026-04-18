import type { FastCommentsStore } from '../store/types';
import { FastCommentsLiveCommentingService } from './fastcomments-live-commenting';

export function canPaginatePrev(store: FastCommentsStore): boolean {
    const state = store.getState();
    return state.page > 0 && !state.pagesLoaded.includes(state.page - 1);
}

export async function paginatePrev(store: FastCommentsStore, service: FastCommentsLiveCommentingService) {
    const state = store.getState();
    state.setPage(state.page - 1);
    await service.fetchRemoteState(true);
}

export function canPaginateNext(store: FastCommentsStore): boolean {
    return store.getState().hasMore;
}

export async function paginateNext(
    store: FastCommentsStore,
    service: FastCommentsLiveCommentingService,
    desiredPage?: number
) {
    const state = store.getState();
    state.setPage(desiredPage !== undefined ? desiredPage : state.page + 1);
    await service.fetchRemoteState(false);
}
