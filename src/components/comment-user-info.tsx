import {CommentUserActivityIcon} from "./comment-user-activity-icon";
import {CommentUserBadge} from "./comment-user-badge";
import {View, Text, Linking, Image, TouchableOpacity} from "react-native";
import type {ReactNode} from "react";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {IFastCommentsStyles, ImageAssetConfig, RNComment} from "../types";
import {FastCommentsRNConfig} from "../types/react-native-config";
import type {FastCommentsStore} from "../store/types";

export interface CommentUserInfoProps {
    comment: RNComment // things here don't change much, so just take the raw comment object
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    styles: IFastCommentsStyles
    translations: Record<string, string>
    store: FastCommentsStore
    /** Live chat compact layout: small avatar left, info + (children) message in a column. **/
    compact?: boolean
    /** In compact layout, the message body rendered under the name line. **/
    children?: ReactNode
}

export function getCommentUserInfoHTML({comment, config, imageAssets, translations, styles}: Omit<CommentUserInfoProps, 'store'>): string {
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

/**
 * Live-chat (Twitch-style) inline prefix: badges + admin/mod label + bold name,
 * as a phrasing-only HTML fragment so it reflows on the SAME line as the message
 * text (see getCommentChatHTML). No trailing space - the caller adds the gap.
 */
export function getCommentChatNameHTML({comment, config, translations}: Pick<CommentUserInfoProps, 'comment' | 'config' | 'translations'>): string {
    let commenterName = comment.commenterName;
    if (comment.isDeleted) {
        commenterName = translations.DELETED_PLACEHOLDER;
    } else if (comment.isBlocked) {
        commenterName = translations.BLOCKED_USER_PLACEHOLDER;
    }

    let label: string | undefined;
    if (comment.displayLabel) {
        label = comment.displayLabel;
    } else if (comment.isByAdmin) {
        label = translations.ADMIN_LABEL;
    } else if (comment.isByModerator) {
        label = translations.MODERATOR_LABEL;
    }

    const nameColor = config.hasDarkBackground ? '#F4F4F5' : '#18181B';
    const labelColor = config.hasDarkBackground ? '#A1A1AA' : '#52525B';

    let badgesHTML = '';
    if (comment.badges && comment.badges.length > 0) {
        badgesHTML = comment.badges.map((badge) => {
            if (badge.displaySrc) {
                return `<img src="${badge.displaySrc}" style="height:14px;width:auto;vertical-align:middle;margin-right:3px"/>`;
            }
            const bg = badge.backgroundColor ? `background-color:${badge.backgroundColor};` : '';
            const bc = badge.borderColor ? `border:1px solid ${badge.borderColor};` : '';
            const tc = badge.textColor ? `color:${badge.textColor};` : '';
            return `<span style="${bg}${bc}${tc}font-size:11px;padding:0 4px;border-radius:4px;margin-right:3px">${badge.displayLabel || ''}</span>`;
        }).join('');
    }

    const labelHTML = label ? `<b style="color:${labelColor};margin-right:4px">${label}</b>` : '';
    // Use <b> (not font-weight in style) - react-native-render-html reliably maps
    // the tag to bold but ignores an inline numeric font-weight.
    return `${badgesHTML}${labelHTML}<b style="color:${nameColor}">${commenterName}</b>`;
}

/**
 * Compose the chat message HTML: the inline name prefix injected into the first
 * paragraph of the message so name + text flow as one wrapping line (Twitch).
 */
export function getCommentChatHTML(namePrefixHTML: string, messageHTML: string): string {
    // margin:0 - the default <p> margin is what makes chat rows look double-spaced.
    const trimmed = (messageHTML || '').trimStart();
    if (trimmed.toLowerCase().startsWith('<p>')) {
        return trimmed.replace(/^<p>/i, `<p style="margin:0">${namePrefixHTML}&nbsp;`);
    }
    return `<p style="margin:0">${namePrefixHTML}&nbsp;${trimmed}</p>`;
}

export function CommentUserInfo(props: CommentUserInfoProps) {
    const {
        comment,
        config,
        imageAssets,
        styles,
        translations,
        store,
        compact,
        children
    } = props;
    // Activity icon renders as a positioned-absolute badge inside the avatar wrapper.
    // The wrapper already has position: 'relative' from styles.commentUserInfo.avatarWrapper(Default).
    const activityIcon = CommentUserActivityIcon({
        disableLiveCommenting: config.disableLiveCommenting,
        userId: comment.userId,
        anonUserId: comment.anonUserId,
        store,
        styles,
        onlineStyle: styles.commentUserInfo?.avatarOnlineBadge,
        offlineStyle: styles.commentUserInfo?.avatarOfflineBadge
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
        {commenterLeftLink ? <TouchableOpacity onPress={() => Linking.openURL(comment.commenterLink!)}>
            {
                <Text style={styles.commentUserInfo?.usernameWithLink}>{commenterName}</Text>
            }
        </TouchableOpacity> : <Text style={styles.commentUserInfo?.username}>{commenterName}</Text>}
    </View>;

    // Compact (chat) shrinks the avatar and lets the activity dot ride on it.
    const avatarWrapStyle = compact
        ? styles.comment?.chatAvatarWrapper
        : (comment.avatarSrc && !comment.isBlocked
            ? styles.commentUserInfo?.avatarWrapper
            : styles.commentUserInfo?.avatarWrapperDefault);
    const avatar = config.hideAvatars ? null : (
        <View style={avatarWrapStyle}>
            <Image
                style={compact ? styles.comment?.chatAvatar : styles.commentUserInfo?.avatarImage}
                source={
                    comment.avatarSrc && !comment.isBlocked
                        ? {uri: comment.avatarSrc}
                        : (config.defaultAvatarSrc ? {uri: config.defaultAvatarSrc} : getDefaultAvatarSrc(imageAssets))
                }
            />
            {activityIcon}
        </View>
    );

    // Name line: badges + label + username + unverified. Stacked in the default
    // layout (infoRight column), inline+wrapping in compact chat (chatHeader row).
    const infoContent = <>
        {comment.badges && comment.badges.length > 0 && comment.badges.map((badge) => <CommentUserBadge key={badge.id} badge={badge} styles={styles}/>)}
        {displayLabel}
        {usernameElement}
        {/* Identity first, status second: leading with "Unverified comment" made
            the negative label the most prominent line of every guest comment. */}
        {!comment.verified && !(comment.wasPostedCurrentSession && comment.requiresVerification) && !config.disableUnverifiedLabel &&
        <Text style={styles.commentUserInfo?.label}>{translations.UNVERIFIED_COMMENT}</Text>}
    </>;

    if (compact) {
        // Twitch-style: avatar (+ activity dot) on the left, then the name is
        // inlined into the message HTML by the caller so it flows on the same
        // wrapping line as the text. We only own the avatar + body column here.
        return <View style={styles.comment?.chatRow}>
            {avatar}
            <View style={styles.comment?.chatBody}>
                {children}
            </View>
        </View>;
    }

    return <View style={styles.commentUserInfo?.root}>
        {avatar ? <View style={styles.commentUserInfo?.infoLeft}>
            {avatar}
        </View> : null}
        <View style={styles.commentUserInfo?.infoRight}>
            {infoContent}
        </View>
    </View>;
}
