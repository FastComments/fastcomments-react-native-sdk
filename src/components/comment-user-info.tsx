// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {CommentUserActivityIcon} from "./comment-user-activity-icon";
import {CommentUserBadge} from "./comment-user-badge";
import {View, Text, StyleSheet, Linking, Image, TouchableOpacity} from "react-native";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import { FastCommentsBadge } from 'fastcomments-typescript';
import {State, useHookstate} from "@hookstate/core";

export function CommentUserInfo(props: FastCommentsCommentWithState) {
    const comment = props.comment;
    const state = useHookstate(props.state); // OPTIMIZATION: local state
    const activityIcon = CommentUserActivityIcon({comment, state});

    /**
     commenterInfoHTML += '<b class="username">' + (config.hideAvatars ? activityIconHTML : '') + (commenterLeftLink ? '<a href="' + comment.commenterLink + '" class="website-url" rel="noreferrer noopener nofollow" target="_blank">' : '') + commenterName + (commenterLeftLink ? '</a>' : '') + '</b>';

     */
    const commenterLeftLink = !comment.isBlocked.get() && comment.commenterLink.get();

    let displayLabel = null;
    if (comment.displayLabel.get()) {
        displayLabel = <Text style={styles.label}>{comment.displayLabel.get()}</Text>;
    } else {
        if (comment.isByAdmin.get()) {
            displayLabel = <Text style={styles.label}>{state.translations.ADMIN_LABEL.get()}</Text>;
        } else if (comment.isByModerator.get()) {
            displayLabel = <Text style={styles.label}>{state.translations.MODERATOR_LABEL.get()}</Text>;
        }
    }

    let commenterName = comment.commenterName.get();

    if (comment.isDeleted.get()) {
        commenterName = state.translations.DELETED_PLACEHOLDER.get();
    } else if (comment.isBlocked.get()) {
        commenterName = state.translations.BLOCKED_USER_PLACEHOLDER.get();
    }

    const usernameElement = <View>
        {state.config.hideAvatars.get() && activityIcon}
        {commenterLeftLink ? <TouchableOpacity onPress={() => Linking.openURL(comment.commenterLink.get()!)}>
            {
                <Text style={styles.usernameWithLink}>{commenterName}</Text>
            }
        </TouchableOpacity> : <Text style={styles.username}>{commenterName}</Text>}
    </View>;

    const avatar = state.config.hideAvatars.get() ? null :
        (
            comment.avatarSrc.get() && !comment.isBlocked.get()
                ? <View style={styles.avatarWrapper}><Image style={styles.avatarImage} source={{uri: comment.avatarSrc.get()}}/>{activityIcon}</View>
                : <View style={styles.avatarWrapperDefault}><Image style={styles.avatarImage} source={state.config.defaultAvatarSrc?.get() ? {uri: state.config.defaultAvatarSrc.get()} : getDefaultAvatarSrc(state)}/>{activityIcon}</View>
        );

    // TODO best way to handle undefined comment.badges instead of cast? TS compilation error
    return <View style={styles.root}>
        {avatar ? <View style={styles.infoLeft}>
            {avatar}
        </View> : null}
        <View style={styles.infoRight}>
            {(comment.badges as State<FastCommentsBadge[]>).map((badge) => CommentUserBadge(badge))}
            {!comment.verified.get() && !(state.commentState[comment._id.get()]?.wasPostedCurrentSession?.get() && state.commentState[comment._id.get()]?.requiresVerification.get()) && !state.config.disableUnverifiedLabel.get() &&
                <Text style={styles.label}>{state.translations.UNVERIFIED_COMMENT.get()}</Text>
            }
            {displayLabel}
            {usernameElement}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    root: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    infoLeft: {
        marginRight: 7
    },
    infoRight: {},
    label: {
        "fontSize": 10,
        "textTransform": "uppercase",
        "fontWeight": "500",
        "color": "#666666"
    },
    username: {
        "fontSize": 12,
        fontWeight: "500",
    },
    usernameWithLink: {
        "color": "#000",
        "textDecorationLine": "underline",
        "textDecorationColor": "black",
        "textDecorationStyle": "solid"
    },
    avatarWrapper: {
        "position": "relative",
        "width": 36,
        "height": 36,
        "overflow": "hidden",
        borderRadius: 36,
        "verticalAlign": "top",
        //box-shadow: 3px 3px 5px 0 rgba(0, 0, 0, 0.10)
        shadowRadius: 5,
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowOffset: {
            width: 6,
            height: 3
        },
        elevation: 2
    },
    avatarWrapperDefault: {
        "position": "relative",
        "width": 36,
        "height": 36,
        "overflow": "hidden",
        borderRadius: 36,
        "verticalAlign": "top",
        "borderWidth": 1,
        "borderColor": "#3f3f3f",
        "borderStyle": "solid",
        //box-shadow: 3px 3px 5px 0 rgba(0, 0, 0, 0.10)
        shadowRadius: 5,
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowOffset: {
            width: 6,
            height: 3
        },
        elevation: 2
    },
    avatarImage: {
        width: 36,
        height: 36,
    }
})
