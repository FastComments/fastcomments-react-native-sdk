// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {FastCommentsCommentView} from "./comment";
import {ScrollView} from "react-native";
import {State} from "@hookstate/core";

export function CommentsList(state: State<FastCommentsState>) {
    console.log('comments list', state.commentsTree.length);
    return <ScrollView>
        {state.commentsTree.map((comment) =>
            <FastCommentsCommentView comment={comment} state={state} key={comment._id.get()}/>
        )}
    </ScrollView>
}
