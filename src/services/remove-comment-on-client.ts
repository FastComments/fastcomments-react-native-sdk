import {removeCommentFromTree} from "./comment-trees";
import {decOverallCommentCount} from "./comment-count";
import {FastCommentsState, RNComment} from "../types";
import {State} from "@hookstate/core";

export function removeCommentOnClient(state: State<FastCommentsState>, comment: State<RNComment>) {
    removeCommentFromTree(state.allComments, state.commentsTree, state.commentsById, comment.get());
    decOverallCommentCount(state.config.countAll.get(), state, comment.parentId?.get());
}
