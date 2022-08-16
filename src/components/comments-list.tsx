import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsCommentView} from "./comment";
import {ScrollView, Text} from "react-native";

export function CommentsList(state: FastCommentsState) {
    return <ScrollView>
        <Text>Comments list:</Text>
        {state.commentsTree.map((comment) =>
            <FastCommentsCommentView comment={comment} state={state} key={comment._id}/>
        )}
    </ScrollView>
}
