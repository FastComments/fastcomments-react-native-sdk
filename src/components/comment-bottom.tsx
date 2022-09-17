// @ts-ignore TODO remove
import * as React from 'react';

import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {Image, TouchableOpacity, View, Text} from "react-native";
import {CommentVote} from "./comment-vote";
import {FastCommentsImageAsset, FastCommentsCallbacks, RNComment, IFastCommentsStyles, ImageAssetConfig, FastCommentsState} from "../types";
import {CommentReplyToggle} from "./comment-reply-toggle";
import {useState} from "react";
import {ReplyArea} from "./reply-area";
import {CommentDisplayDate} from "./comment-dispay-date";
import {FastCommentsRNConfig} from "../types/react-native-config";

export interface CommentBottomProps extends Pick<FastCommentsCallbacks, 'onVoteSuccess' | 'onReplySuccess' | 'onAuthenticationChange' | 'replyingTo' | 'onNotificationSelected'> {
    state: State<FastCommentsState> // we take hookstate here but we try to only use it for the things that change.
    comment: State<RNComment>
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    repliesHiddenState: State<boolean>
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

const STEALTH = { stealth: true };

export function CommentBottom(props: CommentBottomProps) {
    const {
        comment,
        config,
        imageAssets,
        onAuthenticationChange,
        onNotificationSelected,
        onReplySuccess,
        onVoteSuccess,
        replyingTo,
        styles,
        translations,
    } = props;

    // OPTIMIZATION: we only use comment.replyBoxOpen for initial render.
    // TODO This is still not great, because now replyBoxOpen is out of date. Is there a way to use comment.replyBoxOpen.set() without re-rendering all comment objects?
    const [isReplyBoxOpen, setIsReplyBoxOpen] = useState(comment.replyBoxOpen.get(STEALTH));
    const state = useHookstate(props.state); // OPTIMIZATION local state

    useHookstateEffect(() => {
        setIsReplyBoxOpen(comment.replyBoxOpen.get()); // for when replyarea changes value
    }, [comment.replyBoxOpen]);

    return <View style={styles.commentBottom?.root}>
        <View style={styles.commentBottom?.commentBottomToolbar}>
            {
                config.renderDateBelowComment
                && <CommentDisplayDate
                    date={comment.date.get({stealth: true})}
                    translations={translations}
                    absoluteDates={config.absoluteDates}
                    absoluteAndRelativeDates={config.absoluteAndRelativeDates}
                    style={styles.comment?.displayDate}/>
            }
            {!config.renderLikesToRight && <CommentVote comment={comment} config={config} imageAssets={imageAssets} state={state} styles={styles} translations={translations} onVoteSuccess={onVoteSuccess}/>}
            <TouchableOpacity style={styles.commentBottom?.commentBottomToolbarReply} onPress={() => {
                if (config.useSingleReplyField) {
                    // We always expect the callback to exist in this case. Otherwise is an error.
                    replyingTo!(isReplyBoxOpen ? null : comment.get(STEALTH)); // if reply box already open, invoke with null to say we're not replying.
                    setIsReplyBoxOpen(!isReplyBoxOpen);
                } else {
                    replyingTo && replyingTo(comment.get(STEALTH));
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
                onReplySuccess={onReplySuccess}
                parentComment={comment}
                state={state}
                styles={styles}
                translations={translations}
            />
        </View>
        }
        <CommentReplyToggle
            hasDarkBackground={config.hasDarkBackground}
            imageAssets={imageAssets}
            nestedChildrenCount={comment.nestedChildrenCount.get()}
            repliesHiddenState={props.repliesHiddenState}
            styles={styles}
            translations={translations}
        />
    </View>;
}
