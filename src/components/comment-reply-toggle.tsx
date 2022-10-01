// @ts-ignore TODO remove
import * as React from 'react';
import {Image, TouchableOpacity, Text} from "react-native";
import {FastCommentsImageAsset, ImageAssetConfig} from "../types/image-asset";
import {IFastCommentsStyles, RNComment} from "../types";

export interface CommentReplyToggleProps {
    comment: RNComment
    hasDarkBackground?: boolean
    imageAssets: ImageAssetConfig
    nestedChildrenCount?: number
    setRepliesHidden: (comment: RNComment, hidden: boolean) => void
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

export function CommentReplyToggle({
    comment,
    hasDarkBackground,
    imageAssets,
    nestedChildrenCount,
    setRepliesHidden,
    styles,
    translations
}: CommentReplyToggleProps) {
    if (!nestedChildrenCount) {
        return null;
    }
    const countText = <Text style={[styles.commentReplyToggle?.text, styles.commentReplyToggle?.count]}> ({Number(nestedChildrenCount).toLocaleString()})</Text>
    if (comment.repliesHidden) {
        return <TouchableOpacity onPress={() => setRepliesHidden(comment, false)} style={styles.commentReplyToggle?.button}>
            <Image
                source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_EYE_WHITE : FastCommentsImageAsset.ICON_EYE]}
                style={styles.commentReplyToggle?.icon}/>
            <Text style={styles.commentReplyToggle?.text}>{translations.SHOW_REPLIES}</Text>
            {countText}
        </TouchableOpacity>;
    } else {
        return <TouchableOpacity onPress={() => setRepliesHidden(comment, true)} style={styles.commentReplyToggle?.button}>
            <Image
                source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_EYE_SLASH_WHITE : FastCommentsImageAsset.ICON_EYE_SLASH]}
                style={styles.commentReplyToggle?.icon}/>
            <Text style={styles.commentReplyToggle?.text}>{translations.HIDE_REPLIES}</Text>
            {countText}
        </TouchableOpacity>;
    }
}
