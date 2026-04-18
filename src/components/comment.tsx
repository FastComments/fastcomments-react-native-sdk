import { RenderHTMLSource } from 'react-native-render-html';
import { Image, Pressable, TouchableOpacity, View } from 'react-native';
import { CommentMenuState, getCommentMenuState } from './comment-menu';
import { CommentNotices } from './comment-notices';
import { CommentUserInfo, getCommentUserInfoHTML } from './comment-user-info';
import { CommentDisplayDate } from './comment-dispay-date';
import { CommentBottom } from './comment-bottom';
import {
    FastCommentsImageAsset,
    RNComment,
    IFastCommentsStyles,
    FastCommentsCallbacks,
    ImageAssetConfig,
    FastCommentsRNConfig,
} from '../types';
import { CommentVote } from './comment-vote';
import { ShowNewChildLiveCommentsButton } from './show-new-child-live-comments-button';
import { memo } from 'react';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface FastCommentsCommentWithStore {
    comment: RNComment;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState) => void;
    onReplySuccess: (comment: RNComment) => void;
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean>;
    setRepliesHidden: (comment: RNComment, hidden: boolean) => void;
    translations: Record<string, string>;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    width: number;
}

interface HTMLRenderMemoProps {
    html: string;
    width: number;
}

const CommentHTMLRenderMemo = memo<HTMLRenderMemoProps>(
    ({ html, width }) => <RenderHTMLSource source={{ html }} contentWidth={width} />,
    (prevProps, nextProps) => prevProps.html === nextProps.html && prevProps.width === nextProps.width
);

export interface CommentViewProps
    extends FastCommentsCommentWithStore,
        Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onAuthenticationChange' | 'pickGIF' | 'pickImage'> {}

export function FastCommentsCommentView(props: CommentViewProps) {
    const {
        styles,
        comment: propComment,
        config,
        onAuthenticationChange,
        onReplySuccess,
        onVoteSuccess,
        openCommentMenu,
        pickGIF,
        pickImage,
        requestSetReplyingTo,
        setRepliesHidden,
        translations,
        imageAssets,
        width,
        store,
    } = props;

    // Subscribe to this specific comment so we re-render only on its mutations.
    const liveComment = useStoreValue(store, (s) => s.byId[propComment._id]);
    const comment = liveComment ?? propComment;

    const html = comment.isDeleted
        ? translations.DELETED_PLACEHOLDER
        : comment.isBlocked
        ? translations.YOU_BLOCKED_THIS_USER
        : comment.commentHTML;

    const renderCommentInline = config.renderCommentInline;
    const usePressableEditTrigger = config.usePressToEdit;
    const isReadonly = config.readonly;
    const menuState = isReadonly ? null : getCommentMenuState(store, comment);
    const shouldShowMenu = menuState && (menuState.canEdit || menuState.canPin || menuState.canBlockOrFlag);
    const htmlWrapped = `<div style="${styles.comment?.textHTML || ''}">${html}</div>`;
    const finalHTML = renderCommentInline
        ? `<div style="flex-direction:row">${getCommentUserInfoHTML({
              comment,
              config,
              imageAssets,
              translations,
              styles,
          })}${htmlWrapped}</div>`
        : htmlWrapped;

    const content = (
        <View style={styles.comment?.subRoot}>
            <View style={styles.comment?.topRight}>
                {!config.renderDateBelowComment && (
                    <CommentDisplayDate
                        date={comment.date}
                        translations={translations}
                        absoluteDates={config.absoluteDates}
                        absoluteAndRelativeDates={config.absoluteAndRelativeDates}
                        style={styles.comment?.displayDate}
                    />
                )}
                {comment.isPinned && (
                    <Image
                        source={
                            imageAssets[
                                config.hasDarkBackground
                                    ? FastCommentsImageAsset.ICON_PIN_WHITE
                                    : FastCommentsImageAsset.ICON_PIN_RED
                            ]
                        }
                        style={styles.comment?.pin}
                    />
                )}
                {!usePressableEditTrigger && shouldShowMenu && (
                    <TouchableOpacity
                        style={{ padding: 5 }}
                        onPress={() => openCommentMenu(comment, menuState!)}
                    >
                        <Image
                            source={
                                imageAssets[
                                    config.hasDarkBackground
                                        ? FastCommentsImageAsset.ICON_EDIT_SMALL_WHITE
                                        : FastCommentsImageAsset.ICON_EDIT_SMALL
                                ]
                            }
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.comment?.contentWrapper}>
                <CommentNotices comment={comment} styles={styles} translations={translations} />
                {!renderCommentInline && (
                    <CommentUserInfo
                        comment={comment}
                        config={config}
                        imageAssets={imageAssets}
                        styles={styles}
                        translations={translations}
                        store={store}
                    />
                )}
                <CommentHTMLRenderMemo html={finalHTML} width={width} />
                {config.renderLikesToRight && (
                    <CommentVote
                        comment={comment}
                        config={config}
                        imageAssets={imageAssets}
                        store={store}
                        styles={styles}
                        translations={translations}
                        onVoteSuccess={onVoteSuccess}
                    />
                )}
            </View>
            <CommentBottom
                comment={comment}
                store={store}
                config={config}
                translations={translations}
                imageAssets={imageAssets}
                styles={styles}
                onVoteSuccess={onVoteSuccess}
                onReplySuccess={onReplySuccess}
                onAuthenticationChange={onAuthenticationChange}
                pickGIF={pickGIF}
                pickImage={pickImage}
                requestSetReplyingTo={requestSetReplyingTo}
                setRepliesHidden={setRepliesHidden}
            />
            {!comment.repliesHidden && (
                <View style={styles.comment?.children}>
                    {comment.hiddenChildrenCount ? (
                        <ShowNewChildLiveCommentsButton
                            comment={comment}
                            translations={translations}
                            styles={styles}
                            store={store}
                        />
                    ) : null}
                </View>
            )}
        </View>
    );

    const contentWrapped =
        usePressableEditTrigger && shouldShowMenu ? (
            <Pressable onLongPress={() => openCommentMenu(comment, menuState!)}>{content}</Pressable>
        ) : (
            content
        );

    const indentStyles = comment.depth
        ? { marginLeft: comment.depth * (styles.comment?.childIndent || 20) }
        : null;
    return <View style={[styles.comment?.root, indentStyles]}>{contentWrapped}</View>;
}
