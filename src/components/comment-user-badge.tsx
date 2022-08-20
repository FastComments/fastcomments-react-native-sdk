// @ts-ignore TODO remove
import * as React from 'react';

import { FastCommentsBadge } from "fastcomments-typescript";
import {StyleSheet, Image, Text, View} from "react-native";
import {State} from "@hookstate/core";

export function CommentUserBadge(badge: State<FastCommentsBadge>) {
    if (badge.displaySrc.get()) {
        return <View style={styles.imageBadge}>
            <Image style={styles.imageBadgeImage} source={{uri: badge.displaySrc.get()}}/>
        </View>;
    } else {
        const textBadgeStyles = styles.textBadge;
        if (badge.backgroundColor.get()) {
            textBadgeStyles.backgroundColor = badge.backgroundColor.get();
        }
        if (badge.borderColor) {
            textBadgeStyles.borderColor = badge.borderColor.get();
        }
        if (badge.textColor) {
            textBadgeStyles.color = badge.textColor.get();
        }
        return <View style={textBadgeStyles}>
            <Text numberOfLines={1}>{badge.displayLabel.get()}</Text>
        </View>;
    }
}

const styles = StyleSheet.create({
    imageBadge: {
        "marginTop": 3,
        "marginRight": 5,
        "marginBottom": 0,
        "marginLeft": 0,
        "paddingTop": 5,
        "paddingRight": 7,
        "paddingBottom": 5,
        "paddingLeft": 7,
        "fontSize": 12,
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 4,
        "borderBottomRightRadius": 4,
        "borderBottomLeftRadius": 4,
        "borderColor": "transparent",
        "color": "#000",
        "backgroundColor": "transparent"
    },
    imageBadgeImage: {
        maxWidth: 22
    },
    textBadge: {
        "marginTop": 3,
        "marginRight": 5,
        "marginBottom": 0,
        "marginLeft": 0,
        "paddingTop": 5,
        "paddingRight": 7,
        "paddingBottom": 5,
        "paddingLeft": 7,
        "fontSize": 12,
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 4,
        "borderBottomRightRadius": 4,
        "borderBottomLeftRadius": 4,
        "borderColor": "transparent",
        "color": "#000",
        "backgroundColor": "transparent"
    }
})
