import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";
import {FastCommentsState} from "../types/fastcomments-state";

/**
 *
 * @param {object} config
 * @param {object} state
 * @param {string} parentId the parent id of the comment
 */
export function incOverallCommentCount(config: FastCommentsCommentWidgetConfig, state: FastCommentsState, parentId: string | null | undefined) {
    if (!parentId || (parentId && config.countAll)) {
        state.commentCountOnServer++;
    }
}

/**
 *
 * @param {object} config
 * @param {object} state
 * @param {string} parentId the parent id of the comment
 */
export function decOverallCommentCount(config: FastCommentsCommentWidgetConfig, state: FastCommentsState, parentId: string | null | undefined) {
    if (!parentId || (parentId && config.countAll)) {
        state.commentCountOnServer = Math.max(state.commentCountOnServer - 1, 0);
    }
}
