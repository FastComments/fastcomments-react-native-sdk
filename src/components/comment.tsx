// @ts-ignore TODO remove
import * as React from 'react';

import RenderHtml from 'react-native-render-html';

import {FastCommentsState} from "../types/fastcomments-state";
import {Image, useWindowDimensions, View} from "react-native";
import {CommentMenu} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo} from "./comment-user-info";
import {State, useHookstate} from "@hookstate/core";
import {FastCommentsImageAsset} from "../types/image-asset";
import {CommentDisplayDate} from "./comment-dispay-date";
import {CommentBottom} from "./comment-bottom";
import {RNComment} from "../types/react-native-comment";
import {IFastCommentsStyles} from "../types/fastcomments-styles";
import {FastCommentsCallbacks} from "../types";

export interface FastCommentsCommentWithState {
    comment: State<RNComment>;
    state: State<FastCommentsState>;
    styles: IFastCommentsStyles
}

export interface CommentViewProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange'> {}

export function FastCommentsCommentView(props: CommentViewProps) {
    const {comment, styles, onVoteSuccess, onReplySuccess, onAuthenticationChange} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const repliesHiddenState = useHookstate(!!comment.repliesHidden.get());
    // const isMyComment = state.currentUser && 'id' in state.currentUser && (comment.userId === state.currentUser.id || comment.anonUserId === state.currentUser.id);
    console.log('comment re-rendered', comment._id.get({stealth: true}));
    const html = comment.isDeleted.get()
        ? state.translations.DELETED_PLACEHOLDER.get()
        : (
            comment.isBlocked.get()
                ? state.translations.YOU_BLOCKED_THIS_USER.get()
                : comment.commentHTML.get()
        );

    const {width} = useWindowDimensions();

    return <View style={styles.comment?.root}>
        <View style={styles.comment?.topRight}>
            <CommentDisplayDate comment={comment} state={state} style={styles.comment?.displayDate} styles={styles} />
            {comment.isPinned.get() && <Image source={state.imageAssets[FastCommentsImageAsset.ICON_PIN_RED].get()} style={styles.comment?.pin}/>}
            {!(state.config.readonly.get()) && CommentMenu({state, comment, styles})}
        </View>
        <CommentNotices comment={comment} state={state} styles={styles}/>
        <CommentUserInfo comment={comment} state={state} styles={styles}/>
        <RenderHtml source={{html}} contentWidth={width} baseStyle={styles.comment?.contentWrapper}/>
        <CommentBottom comment={comment} state={state} styles={styles} onVoteSuccess={onVoteSuccess} onReplySuccess={onReplySuccess} onAuthenticationChange={onAuthenticationChange} repliesHiddenState={repliesHiddenState} />
        {
            !repliesHiddenState.get() && <View style={styles.comment?.children}>
                {/* TODO how to fix stupid cast here? */}
                {comment.children?.get()! && (comment.children as State<RNComment[]>).map((comment) =>
                    <FastCommentsCommentView comment={comment} state={state} key={comment._id.get()} styles={styles}/>
                )}
            </View>
        }
    </View>;
}
