// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsCommentView} from "./comment";
import {ScrollView} from "react-native";

export function CommentsList(state: FastCommentsState) {
    return <ScrollView>
        {state.commentsTree.map((comment) =>
            <FastCommentsCommentView comment={comment} state={state} key={comment._id}/>
        )}
    </ScrollView>
}
