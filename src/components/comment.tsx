// @ts-ignore TODO remove
import * as React from 'react';

import {RenderHTMLSource} from 'react-native-render-html';

import {Image, Pressable, TouchableOpacity, View} from "react-native";
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
    FastCommentsCallbacks, ImageAssetConfig,
} from "../types";
import {useState} from "react";
import {ModalMenu} from "./modal-menu";
import {CommentVote} from "./comment-vote";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {ShowNewChildLiveCommentsButton} from "./show-new-child-live-comments-button";

export interface FastCommentsCommentWithState {
    comment: State<RNComment>
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    setRepliesHidden: (comment: State<RNComment>, hidden: boolean) => void
    translations: Record<string, string>
    state: State<FastCommentsState>
    styles: IFastCommentsStyles,
    width: number
}

export interface CommentViewProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo' | 'pickImage'> {
}

const STEALTH = {stealth: true, noproxy: true};
const RenderCount: Record<string, number> = {};

export function FastCommentsCommentView(props: CommentViewProps) {
    const {
        styles,
        config,
        onVoteSuccess,
        onReplySuccess,
        onAuthenticationChange,
        pickImage,
        replyingTo,
        setRepliesHidden,
        translations,
        imageAssets,
        width,
    } = props;

    const commentState = useHookstate(props.comment);
    const comment = props.comment.get(STEALTH);
    const id = comment._id;
    if (RenderCount[id] === undefined) {
        RenderCount[id] = 1;
    } else {
        RenderCount[id]++;
    }
    console.log('comment render count', RenderCount[id]);

    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // const repliesHiddenState = useHookstate(comment.repliesHidden);
    const repliesHiddenState = commentState.repliesHidden;

    if (comment.hidden) {
        return null;
    }

    const html = comment.isDeleted
        ? translations.DELETED_PLACEHOLDER
        : (
            comment.isBlocked
                ? translations.YOU_BLOCKED_THIS_USER
                : comment.commentHTML
        );

    // there is no way to do this outside of HTML rendering today, so if we have this flag set to true, we render user info completely differently.
    const renderCommentInline = config.renderCommentInline;
    const usePressableEditTrigger = config.usePressToEdit;
    const isReadonly = config.readonly;
    const menuState = isReadonly ? null : getCommentMenuState(state, commentState);
    const shouldShowMenu = menuState
        && (menuState.canEdit
            || menuState.canPin
            || menuState.canBlockOrFlag);
    const htmlWrapped = `<div style="${styles.comment?.textHTML || ''}">${html}</div>`; // goes away when fixed: https://github.com/meliorence/react-native-render-html/issues/582
    const content = <View style={styles.comment?.subRoot}><View style={styles.comment?.topRight}>
        {
            !config.renderDateBelowComment
            && <CommentDisplayDate
                date={comment.date}
                translations={translations}
                absoluteDates={config.absoluteDates}
                absoluteAndRelativeDates={config.absoluteAndRelativeDates}
                style={styles.comment?.displayDate}/>
        }
        {comment.isPinned && <Image source={imageAssets[FastCommentsImageAsset.ICON_PIN_RED]} style={styles.comment?.pin}/>}
        {!usePressableEditTrigger && shouldShowMenu && <TouchableOpacity style={{padding: 5}} onPress={() => setIsMenuOpen(true)}><Image
            source={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_EDIT_SMALL_WHITE : FastCommentsImageAsset.ICON_EDIT_SMALL]}
            style={{width: 16, height: 16}}/></TouchableOpacity>}
    </View>
        <View style={styles.comment?.contentWrapper}>
            <CommentNotices comment={commentState} styles={styles} translations={translations}/>
            {!renderCommentInline &&
            <CommentUserInfo comment={comment} config={config} imageAssets={imageAssets} styles={styles} translations={translations}
                             userPresenceState={state.userPresenceState}/>}
            {<RenderHTMLSource source={{
                html: renderCommentInline ? `<div style="flex-direction:row">${getCommentUserInfoHTML({
                    comment,
                    config,
                    imageAssets,
                    translations,
                    styles
                })}${htmlWrapped}</div>` : htmlWrapped
            }} contentWidth={width}/>}
            {config.renderLikesToRight &&
            <CommentVote comment={commentState} config={config} imageAssets={imageAssets} state={state} styles={styles} translations={translations}
                         onVoteSuccess={onVoteSuccess}/>}
        </View>
        <CommentBottom comment={commentState}
                       state={state}
                       config={config}
                       translations={translations}
                       imageAssets={imageAssets}
                       styles={styles}
                       onVoteSuccess={onVoteSuccess}
                       onReplySuccess={onReplySuccess}
                       onAuthenticationChange={onAuthenticationChange}
                       pickImage={pickImage}
                       replyingTo={replyingTo}
                       setRepliesHidden={setRepliesHidden}/>
        {!repliesHiddenState.get(STEALTH) && <View style={styles.comment?.children}>
            {comment.hiddenChildrenCount &&
            <ShowNewChildLiveCommentsButton commentTreeNode={commentState} translations={translations} styles={styles}/>}
        </View>}
    </View>

    const contentWrapped = usePressableEditTrigger && shouldShowMenu
        ? <Pressable onLongPress={() => setIsMenuOpen(true)}>
            {content}
        </Pressable> : content;

    const indentStyles = comment.parentId ? {marginLeft: 20} : null; // TODO THIS IS TEMPORARY - CLEANUP
    return <View style={[styles.comment?.root, indentStyles]}>
        {contentWrapped}
        {isMenuOpen && menuState ?
            <ModalMenu closeIcon={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                       styles={styles} items={getCommentMenuItems(props, menuState)} isOpen={true}
                       onClose={() => setIsMenuOpen(false)}/> : null}
    </View>;
}
