import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

export function incOverallCommentCount(countAll: boolean | undefined, state: State<FastCommentsState>, parentId: string | null | undefined) {
    if (!parentId || (parentId && countAll)) {
        state.commentCountOnServer.set((commentCountOnServer) => {
            commentCountOnServer++;
            return commentCountOnServer;
        });
    }
}

export function decOverallCommentCount(countAll: boolean | undefined, state: State<FastCommentsState>, parentId: string | null | undefined) {
    if (!parentId || (parentId && countAll)) {
        state.commentCountOnServer.set((commentCountOnServer) => {
            commentCountOnServer = Math.max(commentCountOnServer - 1, 0);
            return commentCountOnServer;
        });
    }
}
