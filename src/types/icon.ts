import {Image, ImageProps} from "react-native";
import {ComponentElement} from "react";

export enum FastCommentsIconType {
    APPROVE,
    BAN,
    BUBBLE,
    BUBBLE_WHITE,
    CROSS,
    REPLY_ARROW_INACTIVE,
    REPLY_ARROW_ACTIVE,
    UP,
    UP_ACTIVE,
    DOWN,
    DOWN_ACTIVE,
    PIN_BIG,
    UNPIN_BIG,
    PIN_SMALL,
    EDIT_SMALL,
    EDIT_BIG,
    TRASH,
    EYE,
    EYE_SLASH,
    REPLIED,
    BOLD,
    UNDERLINE,
    ITALIC,
    STRIKETHROUGH,
    CODE,
    LINK,
    IMAGE_UPLOAD,
    RETURN,
    GIF,
    IP,
    BELL,
    BELL_RED,
    BLOCK,
    FLAG,
}

export type FastCommentsIconGetter = () => ComponentElement<ImageProps, Image>;
export type IconConfig = Record<FastCommentsIconType, FastCommentsIconGetter>;
