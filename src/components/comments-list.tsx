import {FastCommentsState} from "../types/fastcomments-state";

export function CommentsList(state: FastCommentsState) {
    return state.commentsTree.map((comment) =>
        <div key={comment._id}>

        </div>
    )
}
