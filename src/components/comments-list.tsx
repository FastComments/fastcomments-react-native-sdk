// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types";
import {FastCommentsCommentView} from "./comment";
import {State} from "@hookstate/core";
import {IFastCommentsStyles} from "../types";
import {FastCommentsCallbacks} from "../types";

export interface CommentsListProps extends Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo'> {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function CommentsList({state, styles, onVoteSuccess, onReplySuccess, onAuthenticationChange, replyingTo}: CommentsListProps) {
    // const state = useHookstate(globalState); // TODO creating scoped state
    console.log('comments list', state.commentsTree.length); // TODO remove
    // TODO have configuration option to wrap in ScrollView
    return state.commentsTree.map((comment) =>
        <FastCommentsCommentView
            comment={comment}
            state={state}
            styles={styles}
            key={comment._id.get()}
            onVoteSuccess={onVoteSuccess}
            onReplySuccess={onReplySuccess}
            onAuthenticationChange={onAuthenticationChange}
            replyingTo={replyingTo}
        />
    )
}
