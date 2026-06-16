import { RenderHTMLSource } from 'react-native-render-html';
import { Image, Pressable, TouchableOpacity, View } from 'react-native';
import { CommentMenuState, getCommentMenuState } from './comment-menu';
import { CommentNotices } from './comment-notices';
import { CommentUserInfo, getCommentUserInfoHTML, getCommentChatNameHTML, getCommentChatHTML } from './comment-user-info';
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
import { memo, useRef, type ComponentRef } from 'react';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { measureAnchorRect } from '../services/web-anchor';
import { isLiveChatStyle } from '../services/fastcomments-live-commenting';

export interface FastCommentsCommentWithStore {
    comment: RNComment;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState, anchor?: { top: number; bottom: number; right: number }) => void;
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

    // Web anchors the menu as a dropdown under this row's trigger.
    const menuButtonRef = useRef<ComponentRef<typeof TouchableOpacity>>(null);
    const measureMenuAnchor = (): { top: number; bottom: number; right: number } | undefined => {
        const rect = measureAnchorRect(menuButtonRef);
        return rect ? { top: rect.top, bottom: rect.bottom, right: rect.right } : undefined;
    };

    const html = comment.isDeleted
        ? translations.DELETED_PLACEHOLDER
        : comment.isBlocked
        ? translations.YOU_BLOCKED_THIS_USER
        : comment.commentHTML;

    const renderCommentInline = config.renderCommentInline;
    const isChat = isLiveChatStyle(config);
    const menuDotStyle = config.hasDarkBackground
        ? [styles.comment?.menuDot, { backgroundColor: '#fff' }]
        : styles.comment?.menuDot;
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

    // Live chat: name flows inline with the message text (Twitch-style), so we
    // inject the bold name + badges + label into the message HTML itself rather
    // than rendering a separate name line above it.
    const chatHTML = isChat
        ? getCommentChatHTML(getCommentChatNameHTML({ comment, config, translations }), html)
        : finalHTML;

    const content = (
        <View style={styles.comment?.subRoot}>
            <View style={styles.comment?.topRight}>
                {!config.renderDateBelowComment && !isLiveChatStyle(config) && (
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
                        testID={`pinIcon-${comment._id}`}
                        accessibilityLabel="pinIcon"
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
                {comment.isLocked && (
                    <View
                        testID={`lockIcon-${comment._id}`}
                        accessibilityLabel="lockIcon"
                        style={styles.comment?.lock}
                    />
                )}
                {!usePressableEditTrigger && shouldShowMenu && (
                    <TouchableOpacity
                        ref={menuButtonRef}
                        testID={`commentMenuButton-${comment._id}`}
                        accessibilityLabel="commentMenuButton"
                        style={{ padding: 5 }}
                        onPress={() => openCommentMenu(comment, menuState!, measureMenuAnchor())}
                    >
                        {/* Three vertical dots (kebab), never a pencil - matches the web widget. */}
                        <View style={styles.comment?.menuDots}>
                            <View style={menuDotStyle} />
                            <View style={menuDotStyle} />
                            <View style={menuDotStyle} />
                        </View>
                    </TouchableOpacity>
                )}
            </View>
            <View style={styles.comment?.contentWrapper}>
                <CommentNotices comment={comment} styles={styles} translations={translations} />
                {isChat ? (
                    // Compact chat layout: small avatar on the left, with the name
                    // row (badges, labels, activity dot, unverified) AND the message
                    // stacked in the column beside it - no full-width text under the
                    // avatar, and nothing dropped.
                    <CommentUserInfo
                        comment={comment}
                        config={config}
                        imageAssets={imageAssets}
                        styles={styles}
                        translations={translations}
                        store={store}
                        compact
                    >
                        <CommentHTMLRenderMemo html={chatHTML} width={Math.max(0, width - 56)} />
                    </CommentUserInfo>
                ) : (
                    <>
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
                    </>
                )}
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
            {/* Live chat hides the per-message reply/vote toolbar (matches the web
                live-chat); replies are posted through the single bottom composer. */}
            {!isChat && (
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
            )}
            {/* Only mount the children container when it actually holds the
                "show new replies" button - otherwise it's an empty View with a
                16px top margin on every single comment. */}
            {!comment.repliesHidden && comment.hiddenChildrenCount ? (
                <View style={styles.comment?.children}>
                    <ShowNewChildLiveCommentsButton
                        comment={comment}
                        translations={translations}
                        styles={styles}
                        store={store}
                    />
                </View>
            ) : null}
        </View>
    );

    const contentWrapped =
        usePressableEditTrigger && shouldShowMenu ? (
            <Pressable onLongPress={() => openCommentMenu(comment, menuState!)}>{content}</Pressable>
        ) : (
            content
        );

    // depth/threadLines are attached by the list to its prop copy only; the
    // store object (which wins the merge above) never carries them.
    const depth = propComment.depth ?? comment.depth ?? 0;
    const threadLines = propComment.threadLines ?? [];
    const slotWidth = styles.comment?.childIndent || 20;
    const rail = depth
        ? Array.from({ length: depth }, (_, slot) => {
              const kind = threadLines[slot] ?? 'none';
              return (
                  <View key={slot} style={{ width: slotWidth }}>
                      {(kind === 'line' || kind === 'tee') && (
                          <View testID={`threadLine-${comment._id}-${slot}`} style={styles.comment?.threadLine} />
                      )}
                      {(kind === 'elbow' || kind === 'tee') && (
                          <View testID={`threadElbow-${comment._id}`} style={styles.comment?.threadLineElbow} />
                      )}
                  </View>
              );
          })
        : null;
    return (
        <View
            testID={`commentRow-${comment._id}`}
            accessibilityLabel="commentRow"
            style={styles.comment?.root}
        >
            {rail}
            <View style={isChat ? styles.comment?.chatRowContent : styles.comment?.rowContent}>{contentWrapped}</View>
        </View>
    );
}
