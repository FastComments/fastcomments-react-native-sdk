import {State, useHookstate} from "@hookstate/core";
import {Image, TouchableOpacity, View, Text} from "react-native";
import {CommentVote} from "./comment-vote";
import {FastCommentsImageAsset, FastCommentsCallbacks, RNComment, IFastCommentsStyles, ImageAssetConfig, FastCommentsState} from "../types";
import {CommentReplyToggle} from "./comment-reply-toggle";
import {useState} from "react";
import {ReplyArea} from "./reply-area";
import {CommentDisplayDate} from "./comment-dispay-date";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {CAN_CLOSE} from "./modal-menu";

export interface CommentBottomProps extends Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onAuthenticationChange' | 'onNotificationSelected' | 'pickGIF' | 'pickImage'> {
    state: State<FastCommentsState> // we take hookstate here but we try to only use it for the things that change.
    comment: RNComment
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    onReplySuccess: (comment: RNComment) => void
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean> // true on success
    setRepliesHidden: (comment: RNComment, hidden: boolean) => void
    styles: IFastCommentsStyles
    translations: Record<string, string>
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
        styles,
        translations,
    } = props;

    // OPTIMIZATION: we only use comment.replyBoxOpen for initial render.
    const state = useHookstate(props.state); // OPTIMIZATION local state
    const [isReplyBoxOpen, setIsReplyBoxOpen] = useState(comment.replyBoxOpen);

    return <View style={styles.commentBottom?.root}>
        <View style={styles.commentBottom?.commentBottomToolbar}>
            {
                config.renderDateBelowComment
                && <CommentDisplayDate
                    date={comment.date}
                    translations={translations}
                    absoluteDates={config.absoluteDates}
                    absoluteAndRelativeDates={config.absoluteAndRelativeDates}
                    style={styles.comment?.displayDate}/>
            }
            {!config.renderLikesToRight &&
            <CommentVote comment={comment} config={config} imageAssets={imageAssets} state={state} styles={styles} translations={translations}
                         onVoteSuccess={onVoteSuccess}/>}
            <TouchableOpacity style={styles.commentBottom?.commentBottomToolbarReply} onPress={async () => {
                const canClose = await requestSetReplyingTo!(isReplyBoxOpen ? null : comment);
                if (canClose === CAN_CLOSE) {
                    setIsReplyBoxOpen(!isReplyBoxOpen);
                }
            }
            }>
                <Image
                    source={imageAssets[isReplyBoxOpen ? FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE : FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE]}
                    style={styles.commentBottom?.commentBottomToolbarReplyIcon}/>
                <Text style={styles.commentBottom?.commentBottomToolbarReplyText}>{translations.REPLY}</Text>
            </TouchableOpacity>
        </View>
        {isReplyBoxOpen && !config.useSingleReplyField && <View style={styles.commentBottom?.replyAreaRoot}>
            <ReplyArea
                imageAssets={imageAssets}
                onAuthenticationChange={onAuthenticationChange}
                onNotificationSelected={onNotificationSelected}
                onReplySuccess={(comment) => {
                    setIsReplyBoxOpen(!isReplyBoxOpen);
                    onReplySuccess(comment);
                }
                }
                parentComment={comment}
                pickGIF={pickGIF}
                pickImage={pickImage}
                state={state}
                styles={styles}
                translations={translations}
            />
        </View>
        }
        <CommentReplyToggle
            comment={comment}
            hasDarkBackground={config.hasDarkBackground}
            imageAssets={imageAssets}
            nestedChildrenCount={comment.nestedChildrenCount}
            setRepliesHidden={setRepliesHidden}
            styles={styles}
            translations={translations}
        />
    </View>;
}
