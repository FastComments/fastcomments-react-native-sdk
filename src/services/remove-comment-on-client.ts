import {FastCommentsCommentWithState} from "../components/comment";
import {removeCommentFromTree} from "./comment-trees";
import {decOverallCommentCount} from "./comment-count";

export function removeCommentOnClient({state, comment}: FastCommentsCommentWithState) {
    removeCommentFromTree(state.allComments, state.commentsTree, state.commentsById, comment.get());
    decOverallCommentCount(state.config.get(), state, comment.parentId?.get());
}
