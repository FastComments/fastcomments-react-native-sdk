import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

/**
 *
 * @param {object} config
 * @param {object} state
 * @param {string} parentId the parent id of the comment
 */
export function incOverallCommentCount(config: FastCommentsCommentWidgetConfig, state: State<FastCommentsState>, parentId: string | null | undefined) {
    if (!parentId || (parentId && config.countAll)) {
        state.commentCountOnServer.set((commentCountOnServer) => {
            commentCountOnServer++;
            return commentCountOnServer;
        });
    }
}

/**
 *
 * @param {object} config
 * @param {object} state
 * @param {string} parentId the parent id of the comment
 */
export function decOverallCommentCount(config: FastCommentsCommentWidgetConfig, state: State<FastCommentsState>, parentId: string | null | undefined) {
    if (!parentId || (parentId && config.countAll)) {
        state.commentCountOnServer.set((commentCountOnServer) => {
            commentCountOnServer = Math.max(commentCountOnServer - 1, 0);
            return commentCountOnServer;
        });
    }
}
