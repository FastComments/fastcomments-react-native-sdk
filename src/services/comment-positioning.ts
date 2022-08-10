import {FastCommentsState} from "src/types/fastcomments-state";
import {FastCommentsCommentPositions} from "../types/dto/websocket-live-event";

export function repositionComment(id: string, commentPositions: FastCommentsCommentPositions, state: FastCommentsState) {
    const directionNormalized = state.sortDirection ? state.sortDirection : 'MR';
    const before = commentPositions[directionNormalized].before;
    const after = commentPositions[directionNormalized].after;

    let currentIndex;
    for (let i = 0; i < state.commentsTree.length; i++) {
        if (state.commentsTree[i]._id === id) {
            currentIndex = i;
            break;
        }
    }
    state.commentsTree.splice(currentIndex as number, 1); // TODO checking for > -1 here breaks pin and unpin, not sure why
    let newIndex;
    for (let i = 0; i < state.commentsTree.length; i++) {
        if (state.commentsTree[i]._id === before) {
            newIndex = i + 1;
            break;
        }
        if (state.commentsTree[i]._id === after) {
            newIndex = i - 1;
            break;
        }
    }
    state.commentsTree.splice(newIndex as number, 0, state.commentsById[id]); // TODO checking for > -1 here breaks pin and unpin, not sure why
}
