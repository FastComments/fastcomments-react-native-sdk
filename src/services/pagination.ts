import {FastCommentsState} from "../types";
import {State} from "@hookstate/core";
import {FastCommentsLiveCommentingService} from "./fastcomments-live-commenting";

export function canPaginatePrev(state: State<FastCommentsState>) {
    return state.page.get({stealth: true}) > 0 && !state.pagesLoaded.get().includes(state.page.get() - 1);
}

export async function paginatePrev(state: State<FastCommentsState>, service: FastCommentsLiveCommentingService) {
    state.page.set((page) => page - 1);
    await service.fetchRemoteState(true);
}

export function canPaginateNext(state: State<FastCommentsState>) {
    const stealth = {stealth: true};
    return state.hasMore.get(stealth);
}

export async function paginateNext(state: State<FastCommentsState>, service: FastCommentsLiveCommentingService, desiredPage?: number) {
    state.page.set((page) => desiredPage !== undefined ? desiredPage : page + 1);
    await service.fetchRemoteState(false);
}
