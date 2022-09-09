// @ts-ignore TODO remove
import * as React from 'react';

import {RenderHTMLSource} from 'react-native-render-html';

import {Image, Pressable, TouchableOpacity, useWindowDimensions, View} from "react-native";
import {getCommentMenuItems, getCommentMenuState} from "./comment-menu";
import {CommentNotices} from "./comment-notices";
import {CommentUserInfo, getCommentUserInfoHTML} from "./comment-user-info";
import {State, useHookstate} from "@hookstate/core";
import {CommentDisplayDate} from "./comment-dispay-date";
import {CommentBottom} from "./comment-bottom";
import {
    FastCommentsState,
    FastCommentsImageAsset,
    RNComment,
    IFastCommentsStyles,
    FastCommentsCallbacks,
} from "../types";
import {useState} from "react";
import {ModalMenu} from "./modal-menu";
import {CommentVote} from "./comment-vote";

export interface FastCommentsCommentWithState {
    comment: State<RNComment>;
    state: State<FastCommentsState>;
    styles: IFastCommentsStyles
}

export interface CommentViewProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo'> {
}

// TODO OPTIMIZE further. Seems like these are rendering way more than they need to.
export function FastCommentsCommentView(props: CommentViewProps) {
    const {comment, styles, onVoteSuccess, onReplySuccess, onAuthenticationChange, replyingTo} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const [isMenuOpen, setIsMenuOpen] = useState(false);
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
    // there is no way to do this outside of HTML rendering today, so if we have this flag set to true, we render user info completely differently.
    const renderCommentInline = state.config.renderCommentInline.get();
    const usePressableEditTrigger = state.config.usePressToEdit.get();
    const isReadonly = state.config.readonly.get();
    const menuState = isReadonly ? null : getCommentMenuState(state, comment);
    const htmlWrapped = `<div style="${styles.comment?.textHTML || ''}">${html}</div>`; // goes away when fixed: https://github.com/meliorence/react-native-render-html/issues/582
    const content = <View style={styles.comment?.subRoot}><View style={styles.comment?.topRight}>
        {!state.config.renderDateBelowComment.get() && <CommentDisplayDate comment={comment} state={state} style={styles.comment?.displayDate} styles={styles}/>}
        {comment.isPinned.get() && <Image source={state.imageAssets[FastCommentsImageAsset.ICON_PIN_RED].get()} style={styles.comment?.pin}/>}
        {!usePressableEditTrigger && !isReadonly && <TouchableOpacity style={{padding: 5}} onPress={() => setIsMenuOpen(true)}><Image
            source={state.imageAssets[state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_EDIT_SMALL_WHITE : FastCommentsImageAsset.ICON_EDIT_SMALL].get()}
            style={{width: 16, height: 16}}/></TouchableOpacity>}
    </View>
        <View style={styles.comment?.contentWrapper}>
            <CommentNotices comment={comment} state={state} styles={styles}/>
            {!renderCommentInline && <CommentUserInfo comment={comment} state={state} styles={styles}/>}
            {<RenderHTMLSource source={{html: renderCommentInline ? `<div style="flex-direction:row">${getCommentUserInfoHTML(props)}${htmlWrapped}</div>` : htmlWrapped}} contentWidth={width} />}
            {state.config.renderLikesToRight.get() && <CommentVote comment={comment} state={state} styles={styles} onVoteSuccess={onVoteSuccess}/>}
        </View>
        <CommentBottom comment={comment}
                       state={state}
                       styles={styles}
                       onVoteSuccess={onVoteSuccess}
                       onReplySuccess={onReplySuccess}
                       onAuthenticationChange={onAuthenticationChange}
                       replyingTo={replyingTo}
                       repliesHiddenState={repliesHiddenState}/>
        {!repliesHiddenState.get() && <View style={styles.comment?.children}>
            {/* TODO how to fix stupid cast here? */}
            {comment.children?.get()! && (comment.children as State<RNComment[]>).map((comment) =>
                <FastCommentsCommentView comment={comment} state={state} key={comment._id.get()} styles={styles}/>
            )}
        </View>}
    </View>

    const contentWrapped = usePressableEditTrigger
    && (menuState && (menuState.canEdit
        || menuState.canPin
        || menuState.canBlockOrFlag))
        ? <Pressable onLongPress={() => setIsMenuOpen(true)}>
            {content}
        </Pressable> : content;

    return <View style={styles.comment?.root}>
        {contentWrapped}
        {isMenuOpen && menuState ? <ModalMenu state={state} styles={styles} items={getCommentMenuItems(props, menuState)} isOpen={true}
                                              onClose={() => setIsMenuOpen(false)}/> : null}
    </View>;
}
