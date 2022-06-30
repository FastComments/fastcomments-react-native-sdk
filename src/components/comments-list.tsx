import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsCommentView} from "./comment";

export function CommentsList(state: FastCommentsState) {
    return state.commentsTree.map((comment) =>
        <FastCommentsCommentView comment={comment} state={state} key={comment._id} />
    )
}
