import {RenderHTMLSource} from 'react-native-render-html';

import {Image, Pressable, TouchableOpacity, View} from "react-native";
import {CommentMenuState, getCommentMenuState} from "./comment-menu";
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
import {CommentVote} from "./comment-vote";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {ShowNewChildLiveCommentsButton} from "./show-new-child-live-comments-button";
import {memo} from "react";

export interface FastCommentsCommentWithState {
    comment: RNComment
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState) => void
    setRepliesHidden: (comment: RNComment, hidden: boolean) => void
    translations: Record<string, string>
    state: State<FastCommentsState>
    styles: IFastCommentsStyles,
    width: number
}

interface HTMLRenderMemoProps {
    html: string
    width: number
}

const CommentHTMLRenderMemo = memo<HTMLRenderMemoProps>(
    ({html, width}) => <RenderHTMLSource source={{
        html
    }} contentWidth={width}/>,
    (prevProps, nextProps) => {
        return prevProps.html === nextProps.html && prevProps.width === nextProps.width;
    }
);

export interface CommentViewProps extends FastCommentsCommentWithState, Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo' | 'pickGIF' | 'pickImage'> {
}

const RenderCount: Record<string, number> = {};

export function FastCommentsCommentView(props: CommentViewProps) {
    const {
        styles,
        comment,
        config,
        onAuthenticationChange,
        onReplySuccess,
        onVoteSuccess,
        openCommentMenu,
        pickGIF,
        pickImage,
        replyingTo,
        setRepliesHidden,
        translations,
        imageAssets,
        width,
    } = props;

    const id = comment._id;
    if (RenderCount[id] === undefined) {
        RenderCount[id] = 1;
    } else {
        RenderCount[id]++;
    }
    console.log('comment render count', RenderCount[id]);

    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state

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
    const menuState = isReadonly ? null : getCommentMenuState(state, comment);
    const shouldShowMenu = menuState
        && (menuState.canEdit
            || menuState.canPin
            || menuState.canBlockOrFlag);
    const htmlWrapped = `<div style="${styles.comment?.textHTML || ''}">${html}</div>`; // goes away when fixed: https://github.com/meliorence/react-native-render-html/issues/582
    const finalHTML = renderCommentInline ? `<div style="flex-direction:row">${getCommentUserInfoHTML({
        comment,
        config,
        imageAssets,
        translations,
        styles
    })}${htmlWrapped}</div>` : htmlWrapped;
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
        {comment.isPinned && <Image source={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_PIN_WHITE : FastCommentsImageAsset.ICON_PIN_RED]} style={styles.comment?.pin}/>}
        {!usePressableEditTrigger && shouldShowMenu &&
        <TouchableOpacity style={{padding: 5}} onPress={() => openCommentMenu(comment, menuState)}><Image
            source={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_EDIT_SMALL_WHITE : FastCommentsImageAsset.ICON_EDIT_SMALL]}
            style={{width: 16, height: 16}}/></TouchableOpacity>}
    </View>
        {/* TODO: MEMOIZE RenderHTMLSource so that we can re-render comment w/o re-rendering HTML. */}
        <View style={styles.comment?.contentWrapper}>
            <CommentNotices comment={comment} styles={styles} translations={translations}/>
            {!renderCommentInline &&
            <CommentUserInfo comment={comment} config={config} imageAssets={imageAssets} styles={styles} translations={translations}
                             userPresenceState={state.userPresenceState}/>}
            <CommentHTMLRenderMemo html={finalHTML} width={width} />
            {config.renderLikesToRight &&
            <CommentVote comment={comment} config={config} imageAssets={imageAssets} state={state} styles={styles} translations={translations}
                         onVoteSuccess={onVoteSuccess}/>}
        </View>
        <CommentBottom comment={comment}
                       state={state}
                       config={config}
                       translations={translations}
                       imageAssets={imageAssets}
                       styles={styles}
                       onVoteSuccess={onVoteSuccess}
                       onReplySuccess={onReplySuccess}
                       onAuthenticationChange={onAuthenticationChange}
                       pickGIF={pickGIF}
                       pickImage={pickImage}
                       replyingTo={replyingTo}
                       setRepliesHidden={setRepliesHidden}/>
        {!comment.repliesHidden && <View style={styles.comment?.children}>
            {comment.hiddenChildrenCount &&
            <ShowNewChildLiveCommentsButton comment={comment} translations={translations} styles={styles}/>}
        </View>}
    </View>

    const contentWrapped = usePressableEditTrigger && shouldShowMenu
        ? <Pressable onLongPress={() => openCommentMenu(comment, menuState)}>
            {content}
        </Pressable> : content;

    const indentStyles = comment.parentId ? {marginLeft: 20} : null; // TODO THIS IS TEMPORARY - CLEANUP
    return <View style={[styles.comment?.root, indentStyles]}>
        {contentWrapped}
    </View>;
}
