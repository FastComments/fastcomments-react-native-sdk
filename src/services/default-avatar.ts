import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";

export function getDefaultAvatarSrc(config: FastCommentsCommentWidgetConfig) {
    return (config.defaultAvatarSrc ? config.defaultAvatarSrc : '/images/unknown-person-v2.png');
}
