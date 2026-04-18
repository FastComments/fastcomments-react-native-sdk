import { Image, TouchableOpacity, View, Text } from 'react-native';
import { CommentVote } from './comment-vote';
import {
    FastCommentsImageAsset,
    FastCommentsCallbacks,
    RNComment,
    IFastCommentsStyles,
    ImageAssetConfig,
} from '../types';
import { CommentReplyToggle } from './comment-reply-toggle';
import { useState } from 'react';
import { ReplyArea } from './reply-area';
import { CommentDisplayDate } from './comment-dispay-date';
import { FastCommentsRNConfig } from '../types/react-native-config';
import { CAN_CLOSE } from './modal-menu';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface CommentBottomProps
    extends Pick<
        FastCommentsCallbacks,
        'onVoteSuccess' | 'onAuthenticationChange' | 'onNotificationSelected' | 'pickGIF' | 'pickImage'
    > {
    store: FastCommentsStore;
    comment: RNComment;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    onReplySuccess: (comment: RNComment) => void;
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean>;
    setRepliesHidden: (comment: RNComment, hidden: boolean) => void;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

export function CommentBottom(props: CommentBottomProps) {
    const {
        comment,
        config,
        imageAssets,
        onAuthenticationChange,
        onNotificationSelected,
        onReplySuccess,
        onVoteSuccess,
        pickGIF,
        pickImage,
        requestSetReplyingTo,
        setRepliesHidden,
        store,
        styles,
        translations,
    } = props;

    const [isReplyBoxOpen, setIsReplyBoxOpen] = useState(comment.replyBoxOpen);
    const nestedChildrenCount = useStoreValue(store, (s) => s.nestedCountById[comment._id]);

    return (
        <View style={styles.commentBottom?.root}>
            <View style={styles.commentBottom?.commentBottomToolbar}>
                {config.renderDateBelowComment && (
                    <CommentDisplayDate
                        date={comment.date}
                        translations={translations}
                        absoluteDates={config.absoluteDates}
                        absoluteAndRelativeDates={config.absoluteAndRelativeDates}
                        style={styles.comment?.displayDate}
                    />
                )}
                {!config.renderLikesToRight && (
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
                <TouchableOpacity
                    style={styles.commentBottom?.commentBottomToolbarReply}
                    onPress={async () => {
                        const canClose = await requestSetReplyingTo!(isReplyBoxOpen ? null : comment);
                        if (canClose === CAN_CLOSE) setIsReplyBoxOpen(!isReplyBoxOpen);
                    }}
                >
                    <Image
                        source={
                            imageAssets[
                                isReplyBoxOpen
                                    ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE
                                    : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE
                            ]
                        }
                        style={styles.commentBottom?.commentBottomToolbarReplyIcon}
                    />
                    <Text style={styles.commentBottom?.commentBottomToolbarReplyText}>{translations.REPLY}</Text>
                </TouchableOpacity>
            </View>
            {isReplyBoxOpen && !config.useSingleReplyField && (
                <View style={styles.commentBottom?.replyAreaRoot}>
                    <ReplyArea
                        imageAssets={imageAssets}
                        onAuthenticationChange={onAuthenticationChange}
                        onNotificationSelected={onNotificationSelected}
                        onReplySuccess={(replied) => {
                            setIsReplyBoxOpen(!isReplyBoxOpen);
                            onReplySuccess(replied);
                        }}
                        parentComment={comment}
                        pickGIF={pickGIF}
                        pickImage={pickImage}
                        store={store}
                        styles={styles}
                        translations={translations}
                    />
                </View>
            )}
            <CommentReplyToggle
                comment={comment}
                hasDarkBackground={config.hasDarkBackground}
                imageAssets={imageAssets}
                nestedChildrenCount={nestedChildrenCount}
                setRepliesHidden={setRepliesHidden}
                styles={styles}
                translations={translations}
            />
        </View>
    );
}
