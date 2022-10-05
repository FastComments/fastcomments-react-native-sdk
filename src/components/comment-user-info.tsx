// @ts-ignore TODO remove
import * as React from 'react';

import {CommentUserActivityIcon} from "./comment-user-activity-icon";
import {CommentUserBadge} from "./comment-user-badge";
import {View, Text, Linking, Image, TouchableOpacity} from "react-native";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {State} from "@hookstate/core";
import {IFastCommentsStyles, ImageAssetConfig, RNComment, UserPresenceState} from "../types";
import {FastCommentsRNConfig} from "../types/react-native-config";

export interface CommentUserInfoProps {
    comment: RNComment // things here don't change much, so just take the raw comment object
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    styles: IFastCommentsStyles
    translations: Record<string, string>
    userPresenceState: State<UserPresenceState>
}

export function getCommentUserInfoHTML({comment, config, imageAssets, translations, styles}: Omit<CommentUserInfoProps, 'userPresenceState'>): string {
    // let displayLabel = null;
    // if (comment.displayLabel) {
    //     displayLabel = `<div style="${styles.commentUserInfoAsHTML?.label}">${comment.displayLabel}</div>`;
    // } else {
    //     if (comment.isByAdmin) {
    //         displayLabel = `<div style="${styles.commentUserInfoAsHTML?.label}">${translations.ADMIN_LABEL}</div>`;
    //     } else if (comment.isByModerator) {
    //         displayLabel = `<div style="${styles.commentUserInfoAsHTML?.label}">${translations.MODERATOR_LABEL}</div>`;
    //     }
    // }

    let commenterName = comment.commenterName;

    if (comment.isDeleted) {
        commenterName = translations.DELETED_PLACEHOLDER;
    } else if (comment.isBlocked) {
        commenterName = translations.BLOCKED_USER_PLACEHOLDER;
    }

    const usernameElement = `<div style="${styles.commentUserInfoAsHTML?.username}">${commenterName}</div>`;

    const avatar = config.hideAvatars ? null :
        (
            comment.avatarSrc && !comment.isBlocked
                ? `<div style="${styles.commentUserInfoAsHTML?.avatarWrapper}"><img style="${styles.commentUserInfoAsHTML?.avatarImage}" src="${comment.avatarSrc}"/></div>`
                : `<div style="${styles.commentUserInfoAsHTML?.avatarWrapperDefault}"><img style="${styles.commentUserInfoAsHTML?.avatarImage}" src="${config.defaultAvatarSrc ? config.defaultAvatarSrc : getDefaultAvatarSrc(imageAssets)}"/></div>`
        );

    return `<div style="${styles.commentUserInfoAsHTML?.root}">
        <div style="${styles.commentUserInfoAsHTML?.infoLeft}">${avatar}</div>
        <div style="${styles.commentUserInfoAsHTML?.infoRight}">
            ${usernameElement}
        </div>
    </div>`;
}

export function CommentUserInfo(props: CommentUserInfoProps) {
    const {
        comment,
        config,
        imageAssets,
        styles,
        translations,
        userPresenceState
    } = props;
    const activityIcon = CommentUserActivityIcon({
        disableLiveCommenting: config.disableLiveCommenting,
        userId: comment.userId,
        anonUserId: comment.anonUserId,
        userPresenceState,
        styles
    });

    const commenterLeftLink = !comment.isBlocked && comment.commenterLink;

    let displayLabel = null;
    if (comment.displayLabel) {
        displayLabel = <Text style={styles.commentUserInfo?.label}>{comment.displayLabel}</Text>;
    } else {
        if (comment.isByAdmin) {
            displayLabel = <Text style={styles.commentUserInfo?.label}>{translations.ADMIN_LABEL}</Text>;
        } else if (comment.isByModerator) {
            displayLabel = <Text style={styles.commentUserInfo?.label}>{translations.MODERATOR_LABEL}</Text>;
        }
    }

    let commenterName = comment.commenterName;

    if (comment.isDeleted) {
        commenterName = translations.DELETED_PLACEHOLDER;
    } else if (comment.isBlocked) {
        commenterName = translations.BLOCKED_USER_PLACEHOLDER;
    }

    const usernameElement = <View>
        {config.hideAvatars && activityIcon}
        {commenterLeftLink ? <TouchableOpacity onPress={() => Linking.openURL(comment.commenterLink!)}>
            {
                <Text style={styles.commentUserInfo?.usernameWithLink}>{commenterName}</Text>
            }
        </TouchableOpacity> : <Text style={styles.commentUserInfo?.username}>{commenterName}</Text>}
    </View>;

    const avatar = config.hideAvatars ? null :
        (
            comment.avatarSrc && !comment.isBlocked
                ? <View style={styles.commentUserInfo?.avatarWrapper}><Image style={styles.commentUserInfo?.avatarImage}
                                                                             source={{uri: comment.avatarSrc}}/>{activityIcon}</View>
                : <View style={styles.commentUserInfo?.avatarWrapperDefault}><Image style={styles.commentUserInfo?.avatarImage}
                                                                                    source={config.defaultAvatarSrc ? {uri: config.defaultAvatarSrc} : getDefaultAvatarSrc(imageAssets)}/>{activityIcon}
                </View>
        );

    // TODO best way to handle undefined comment.badges instead of cast? TS compilation error
    return <View style={styles.commentUserInfo?.root}>
        {avatar ? <View style={styles.commentUserInfo?.infoLeft}>
            {avatar}
        </View> : null}
        <View style={styles.commentUserInfo?.infoRight}>
            {comment.badges && comment.badges.map((badge) => <CommentUserBadge key={badge.id} badge={badge} styles={styles}/>)}
            {!comment.verified && !(comment.wasPostedCurrentSession && comment.requiresVerification) && !config.disableUnverifiedLabel &&
            <Text style={styles.commentUserInfo?.label}>{translations.UNVERIFIED_COMMENT}</Text>
            }
            {displayLabel}
            {usernameElement}
        </View>
    </View>;
}
