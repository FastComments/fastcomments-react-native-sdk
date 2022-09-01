// @ts-ignore TODO remove
import * as React from 'react';

import { FastCommentsBadge } from "fastcomments-typescript";
import {Image, Text, View} from "react-native";
import {State} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface CommentUserBadgeProps {
    badge: State<FastCommentsBadge>
    styles: IFastCommentsStyles
}

export function CommentUserBadge({badge, styles}: CommentUserBadgeProps) {
    if (badge.displaySrc.get()) {
        return <View style={styles.commentUserBadge.imageBadge}>
            <Image style={styles.commentUserBadge.imageBadgeImage} source={{uri: badge.displaySrc.get()}}/>
        </View>;
    } else {
        const textBadgeStyles = {...styles.commentUserBadge.textBadge};
        const textBadgeTextStyles = {...styles.commentUserBadge.textBadgeText};
        if (badge.backgroundColor.get()) {
            textBadgeStyles.backgroundColor = badge.backgroundColor.get();
        }
        if (badge.borderColor) {
            textBadgeStyles.borderColor = badge.borderColor.get();
        }
        if (badge.textColor) {
            textBadgeTextStyles.color = badge.textColor.get();
        }
        return <View style={textBadgeStyles}>
            <Text numberOfLines={1} style={textBadgeTextStyles}>{badge.displayLabel.get()}</Text>
        </View>;
    }
}
