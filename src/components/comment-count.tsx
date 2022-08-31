// @ts-ignore TODO remove
import * as React from 'react';
import {Text, TextStyle} from 'react-native';
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

export interface LiveCommentingCommentCountProps {
    state: State<FastCommentsState>
    style?: TextStyle
    count: number
}

export function CommentCount({state, style, count}: LiveCommentingCommentCountProps) {
    const configFormat = state.config.commentCountFormat.get();
    if (configFormat) {
        return <Text style={style}>{configFormat.replace('[count]', Number(count).toLocaleString())}</Text>;
    } else {
        return <Text style={style}>{Number(count).toLocaleString() + (count === 1 ? state.translations.COMMENT_THIS_PAGE.get() : state.translations.COMMENTS_THIS_PAGE.get())}</Text>;
    }
}
