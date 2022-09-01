// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {CommentUserActivityIcon} from "./comment-user-activity-icon";
import {CommentUserBadge} from "./comment-user-badge";
import {View, Text, Linking, Image, TouchableOpacity} from "react-native";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import { FastCommentsBadge } from 'fastcomments-typescript';
import {State, useHookstate} from "@hookstate/core";

export function CommentUserInfo(props: FastCommentsCommentWithState) {
    const {comment, styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: local state
    const activityIcon = CommentUserActivityIcon({comment, state, styles});

    /**
     commenterInfoHTML += '<b class="username">' + (config.hideAvatars ? activityIconHTML : '') + (commenterLeftLink ? '<a href="' + comment.commenterLink + '" class="website-url" rel="noreferrer noopener nofollow" target="_blank">' : '') + commenterName + (commenterLeftLink ? '</a>' : '') + '</b>';

     */
    const commenterLeftLink = !comment.isBlocked.get() && comment.commenterLink.get();

    let displayLabel = null;
    if (comment.displayLabel.get()) {
        displayLabel = <Text style={styles.commentUserInfo.label}>{comment.displayLabel.get()}</Text>;
    } else {
        if (comment.isByAdmin.get()) {
            displayLabel = <Text style={styles.commentUserInfo.label}>{state.translations.ADMIN_LABEL.get()}</Text>;
        } else if (comment.isByModerator.get()) {
            displayLabel = <Text style={styles.commentUserInfo.label}>{state.translations.MODERATOR_LABEL.get()}</Text>;
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
                <Text style={styles.commentUserInfo.usernameWithLink}>{commenterName}</Text>
            }
        </TouchableOpacity> : <Text style={styles.commentUserInfo.username}>{commenterName}</Text>}
    </View>;

    const avatar = state.config.hideAvatars.get() ? null :
        (
            comment.avatarSrc.get() && !comment.isBlocked.get()
                ? <View style={styles.commentUserInfo.avatarWrapper}><Image style={styles.commentUserInfo.avatarImage} source={{uri: comment.avatarSrc.get()}}/>{activityIcon}</View>
                : <View style={styles.commentUserInfo.avatarWrapperDefault}><Image style={styles.commentUserInfo.avatarImage} source={state.config.defaultAvatarSrc?.get() ? {uri: state.config.defaultAvatarSrc.get()} : getDefaultAvatarSrc(state)}/>{activityIcon}</View>
        );

    // TODO best way to handle undefined comment.badges instead of cast? TS compilation error
    return <View style={styles.commentUserInfo.root}>
        {avatar ? <View style={styles.commentUserInfo.infoLeft}>
            {avatar}
        </View> : null}
        <View style={styles.commentUserInfo.infoRight}>
            {(comment.badges as State<FastCommentsBadge[]>).map((badge) => <CommentUserBadge badge={badge} styles={styles} />)}
            {!comment.verified.get() && !(comment.wasPostedCurrentSession.get() && comment.requiresVerification.get()) && !state.config.disableUnverifiedLabel.get() &&
                <Text style={styles.commentUserInfo.label}>{state.translations.UNVERIFIED_COMMENT.get()}</Text>
            }
            {displayLabel}
            {usernameElement}
        </View>
    </View>;
}
