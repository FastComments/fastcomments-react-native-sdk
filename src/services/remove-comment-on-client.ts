import {FastCommentsCommentWithState} from "../components/comment";
import {removeCommentFromTree} from "./comment-trees";
import {decOverallCommentCount} from "./comment-count";

export function removeCommentOnClient({state, comment}: Pick<FastCommentsCommentWithState, 'comment' | 'state'>) {
    removeCommentFromTree(state.allComments, state.commentsTree, state.commentsById, comment.get());
    decOverallCommentCount(state.config.countAll.get(), state, comment.parentId?.get());
}
