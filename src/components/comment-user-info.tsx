import {FastCommentsCommentWithState} from "./comment";
import {CommentUserActivityIcon} from "./comment-user-activity-icon";
import {CommentUserBadge} from "./comment-user-badge";
import {View, Text, StyleSheet, Pressable, Linking, Image} from "react-native";
import {getDefaultAvatarSrc} from "../services/default-avatar";

export function CommentUserInfo(commentWithState: FastCommentsCommentWithState) {
    const {comment, state} = commentWithState;

    const activityIcon = CommentUserActivityIcon(commentWithState);

    /**
     commenterInfoHTML += '<b class="username">' + (config.hideAvatars ? activityIconHTML : '') + (commenterLeftLink ? '<a href="' + comment.commenterLink + '" class="website-url" rel="noreferrer noopener nofollow" target="_blank">' : '') + commenterName + (commenterLeftLink ? '</a>' : '') + '</b>';

     */
    const commenterLeftLink = !comment.isBlocked && comment.commenterLink;

    let displayLabel = null;
    if (comment.displayLabel) {
        displayLabel = <Text style={styles.label}>{comment.displayLabel}</Text>;
    } else {
        if (comment.isByAdmin) {
            displayLabel = <Text style={styles.label}>{state.translations.ADMIN_LABEL}</Text>;
        } else if (comment.isByModerator) {
            displayLabel = <Text style={styles.label}>{state.translations.MODERATOR_LABEL}</Text>;
        }
    }

    let commenterName = comment.commenterName;

    if (comment.isDeleted) {
        commenterName = state.translations.DELETED_PLACEHOLDER;
    } else if (comment.isBlocked) {
        commenterName = state.translations.BLOCKED_USER_PLACEHOLDER;
    }

    const usernameElement = <View>
        {state.config.hideAvatars && activityIcon}
        {commenterLeftLink ? <Pressable onPress={() => Linking.openURL(comment.commenterLink)}>
            {({pressed}) =>
                <Text style={styles.usernameWithLink}>{commenterName}</Text>
            }
        </Pressable> : <Text style={styles.username}>{commenterName}</Text>}
    </View>;

    const avatar = state.config.hideAvatars ? null :
        (
            comment.avatarSrc && !comment.isBlocked
                ? <View style={styles.avatarWrapper}><Image style={styles.avatarImage} source={{uri: comment.avatarSrc}}/>{activityIcon}</View>
                : <View style={styles.avatarWrapperDefault}><Image style={styles.avatarImage} source={{uri: getDefaultAvatarSrc(state.config)}}/>{activityIcon}</View>
        );

    return <View>
        {comment.badges && comment.badges.map((badge) => CommentUserBadge(badge))}
        {!comment.verified && !(state.commentState[comment._id]?.wasPostedCurrentSession && state.commentState[comment._id]?.requiresVerification) && !state.config.disableUnverifiedLabel &&
            <Text style={styles.label}>{state.translations.UNVERIFIED_COMMENT}</Text>
        }
        {displayLabel}
        {usernameElement}
        {avatar}
    </View>;
}

const styles = StyleSheet.create({
    label: {
        "fontSize": 10,
        "textTransform": "uppercase",
        "fontWeight": "500",
        "color": "#666666"
    },
    username: {
        fontWeight: "bold"
    },
    usernameWithLink: {
        "color": "#000",
        "textDecorationLine": "underline",
        "textDecorationColor": "black",
        "textDecorationStyle": "solid"
    },
    avatarWrapper: {
        "position": "relative",
        "width": 56,
        "height": 56,
        "overflow": "hidden",
        "borderTopLeftRadius": 15,
        "borderTopRightRadius": 0,
        "borderBottomRightRadius": 15,
        "borderBottomLeftRadius": 15,
        "verticalAlign": "top"
    },
    avatarWrapperDefault: {
        "position": "relative",
        "width": 56,
        "height": 56,
        "overflow": "hidden",
        "borderTopLeftRadius": 15,
        "borderTopRightRadius": 0,
        "borderBottomRightRadius": 15,
        "borderBottomLeftRadius": 15,
        "verticalAlign": "top",
        "borderWidth": 1,
        "borderColor": "#3f3f3f",
        "borderStyle": "solid"
    },
    avatarImage: {
        width: 40,
        height: 40,
    }
})
