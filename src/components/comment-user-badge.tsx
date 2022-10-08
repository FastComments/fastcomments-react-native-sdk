import { FastCommentsBadge } from "fastcomments-typescript";
import {Image, Text, View} from "react-native";
import {IFastCommentsStyles} from "../types";

export interface CommentUserBadgeProps {
    badge: FastCommentsBadge
    styles: IFastCommentsStyles
}

export function CommentUserBadge({badge, styles}: CommentUserBadgeProps) {
    if (badge.displaySrc) {
        return <View style={styles.commentUserBadge?.imageBadge}>
            <Image style={styles.commentUserBadge?.imageBadgeImage} source={{uri: badge.displaySrc}}/>
        </View>;
    } else {
        const textBadgeStyles = {...styles.commentUserBadge?.textBadge};
        const textBadgeTextStyles = {...styles.commentUserBadge?.textBadgeText};
        if (badge.backgroundColor) {
            textBadgeStyles.backgroundColor = badge.backgroundColor;
        }
        if (badge.borderColor) {
            textBadgeStyles.borderColor = badge.borderColor;
        }
        if (badge.textColor) {
            textBadgeTextStyles.color = badge.textColor;
        }
        return <View style={textBadgeStyles}>
            <Text numberOfLines={1} style={textBadgeTextStyles}>{badge.displayLabel}</Text>
        </View>;
    }
}
