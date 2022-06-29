import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsComment} from "./comment";

export function CommentsList(state: FastCommentsState) {
    return state.commentsTree.map((comment) =>
        <FastCommentsComment comment={comment} state={state} key={comment._id} />
    )
}
