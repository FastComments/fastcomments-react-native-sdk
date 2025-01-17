import {FastCommentsState} from "src/types/fastcomments-state";
import {FastCommentsCommentPositions, RNComment} from "../types";
import {State} from "@hookstate/core";

export function repositionComment(id: string, commentPositions: FastCommentsCommentPositions, state: State<FastCommentsState>) {
    // console.log('BEGIN repositionComment', id, JSON.stringify(commentPositions));

    // we delete the comment from the tree, and then add it back into the correct spot.
    state.commentsTree.set((commentsTree) => {
        let currentIndex: number;
        for (let i = 0; i < state.commentsTree.length; i++) {
            if (state.commentsTree[i]._id.get({stealth: true}) === id) {
                currentIndex = i;
                break;
            }
        }
        if (currentIndex! > -1) {
            commentsTree.splice(currentIndex!, 1);
        }
        return commentsTree;
    });

    const directionNormalized = state.sortDirection.get() ? state.sortDirection.get() : 'MR';
    const before = commentPositions[directionNormalized].before;
    const after = commentPositions[directionNormalized].after;
    state.commentsTree.set((commentsTree) => {
        let newIndex: number;
        for (let i = 0; i < state.commentsTree.length; i++) {
            if (state.commentsTree[i]._id.get() === before) {
                newIndex = i + 1;
                break;
            }
            if (state.commentsTree[i]._id.get() === after) {
                newIndex = Math.max(i - 1, 0);
                break;
            }
        }
        // checking for > -1 here breaks pin and unpin because if it's -1 we want to add back to the tree, for example when there is only
        // one page.
        // noproxy is important here because otherwise we put a state object into the tree where only raw objects should be, inside a parent state object.
        // this will cause things to blow up on re-render and trying to modify the comment object (like pinning again), since we have no run-time
        // type checking. :)
        // cast is needed as even with noproxy
        commentsTree.splice(newIndex!, 0, state.commentsById[id].get({stealth: true, noproxy: true}) as RNComment);
        return commentsTree;
    });
}
