import { FastCommentsBadge } from "fastcomments-typescript";
import {StyleSheet, Image, Text, View} from "react-native";

export function CommentUserBadge(badge: FastCommentsBadge) {
    if (badge.displaySrc) {
        return <View style={styles.imageBadge}>
            <Image style={styles.imageBadgeImage} source={{uri: badge.displaySrc}}/>
        </View>;
    } else {
        const textBadgeStyles = styles.textBadge;
        if (badge.backgroundColor) {
            textBadgeStyles.backgroundColor = badge.backgroundColor;
        }
        if (badge.borderColor) {
            textBadgeStyles.borderColor = badge.borderColor;
        }
        if (badge.textColor) {
            textBadgeStyles.color = badge.textColor;
        }
        return <View style={textBadgeStyles} title={badge.description}>
            <Text numberOfLines={1}>{badge.displayLabel}</Text>
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
