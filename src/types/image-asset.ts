import {ImageURISource} from "react-native";

export enum FastCommentsImageAsset {
    ICON_APPROVE,
    ICON_BAN,
    ICON_BUBBLE,
    ICON_BUBBLE_WHITE,
    ICON_CROSS,
    ICON_REPLY_ARROW_INACTIVE,
    ICON_REPLY_ARROW_ACTIVE,
    ICON_UP,
    ICON_UP_ACTIVE,
    ICON_DOWN,
    ICON_DOWN_ACTIVE,
    ICON_PIN_BIG,
    ICON_UNPIN_BIG,
    ICON_PIN_SMALL,
    ICON_PIN_RED,
    ICON_EDIT_SMALL,
    ICON_EDIT_BIG,
    ICON_TRASH,
    ICON_EYE,
    ICON_EYE_SLASH,
    ICON_REPLIED,
    ICON_BOLD,
    ICON_UNDERLINE,
    ICON_ITALIC,
    ICON_STRIKETHROUGH,
    ICON_CODE,
    ICON_LINK,
    ICON_IMAGE_UPLOAD,
    ICON_RETURN,
    ICON_GIF,
    ICON_IP,
    ICON_BELL,
    ICON_BELL_RED,
    ICON_BLOCK,
    ICON_FLAG,
    AVATAR_DEFAULT
}

export type ImageAssetConfig = Record<FastCommentsImageAsset, ImageURISource>;