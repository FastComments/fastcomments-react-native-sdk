import {FastCommentsState} from "src/types/fastcomments-state";
import {FastCommentsCommentPositions} from "../types/dto/websocket-live-event";
import {State} from "@hookstate/core";

export function repositionComment(id: string, commentPositions: FastCommentsCommentPositions, state: State<FastCommentsState>) {
    const directionNormalized = state.sortDirection.get() ? state.sortDirection.get() : 'MR';
    const before = commentPositions[directionNormalized].before;
    const after = commentPositions[directionNormalized].after;

    let currentIndex: number;
    for (let i = 0; i < state.commentsTree.length; i++) {
        if (state.commentsTree[i]._id.get() === id) {
            currentIndex = i;
            break;
        }
    }
    state.commentsTree.set((commentsTree) => {
        commentsTree.splice(currentIndex, 1); // TODO checking for > -1 here breaks pin and unpin, not sure why
        return commentsTree;
    });
    let newIndex: number;
    for (let i = 0; i < state.commentsTree.length; i++) {
        if (state.commentsTree[i]._id.get() === before) {
            newIndex = i + 1;
            break;
        }
        if (state.commentsTree[i]._id.get() === after) {
            newIndex = i - 1;
            break;
        }
    }
    state.commentsTree.set((commentsTree) => {
        commentsTree.splice(newIndex, 0, state.commentsById[id].get()); // TODO checking for > -1 here breaks pin and unpin, not sure why
        return commentsTree;
    });
}
