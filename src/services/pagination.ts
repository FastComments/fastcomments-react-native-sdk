import {FastCommentsState} from "../types";
import {State} from "@hookstate/core";
import {FastCommentsLiveCommentingService} from "./fastcomments-live-commenting";

export function canPaginatePrev(state: State<FastCommentsState>) {
    return state.page.get({stealth: true}) > 0;
}

export async function paginatePrev(state: State<FastCommentsState>, service: FastCommentsLiveCommentingService) {
    state.page.set((page) => page - 1);
    await service.fetchRemoteState(true);
}

export function canPaginateNext(state: State<FastCommentsState>) {
    const stealth = {stealth: true};
    return Math.ceil(state.commentCountOnServer.get(stealth) / state.PAGE_SIZE.get(stealth)) > state.page.get(stealth);

}

export async function paginateNext(state: State<FastCommentsState>, service: FastCommentsLiveCommentingService) {
    state.page.set((page) => page + 1);
    await service.fetchRemoteState(false);
}
