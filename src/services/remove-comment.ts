import {FastCommentsCommentWithState} from "../components/comment";
import {removeCommentFromTree} from "./comment-trees";
import {decOverallCommentCount} from "./comment-count";

export function removeComment({state, comment}: FastCommentsCommentWithState) {
    removeCommentFromTree(state.allComments, state.commentsTree, state.commentsById, comment);
    decOverallCommentCount(state.config, state, comment.parentId);
}
