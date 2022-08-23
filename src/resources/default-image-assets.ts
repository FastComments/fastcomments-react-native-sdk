import {FastCommentsImageAsset, ImageAssetConfig} from "../types/image-asset";

export const DefaultImageAssets: ImageAssetConfig = {
    // icons
    [FastCommentsImageAsset.ICON_APPROVE]: require('./icons/approve.png'),
    [FastCommentsImageAsset.ICON_BAN]: require('./icons/ban.png'),
    [FastCommentsImageAsset.ICON_BUBBLE]: require('./icons/text_bubble_dark.png'),
    [FastCommentsImageAsset.ICON_BUBBLE_WHITE]: require('./icons/text_bubble_white.png'),
    [FastCommentsImageAsset.ICON_CROSS]: require('./icons/close.png'),
    [FastCommentsImageAsset.ICON_REPLY_ARROW_INACTIVE]: require('./icons/reply_inactive.png'),
    [FastCommentsImageAsset.ICON_REPLY_ARROW_ACTIVE]: require('./icons/reply.png'),
    [FastCommentsImageAsset.ICON_UP]: require('./icons/thumbs_up_light.png'),
    [FastCommentsImageAsset.ICON_UP_ACTIVE]: require('./icons/thumbs_up_dark.png'),
    [FastCommentsImageAsset.ICON_DOWN]: require('./icons/thumbs_down_light.png'),
    [FastCommentsImageAsset.ICON_DOWN_ACTIVE]: require('./icons/thumbs_down_dark.png'),
    [FastCommentsImageAsset.ICON_PIN_BIG]: require('./icons/pin.png'),
    [FastCommentsImageAsset.ICON_UNPIN_BIG]: require('./icons/pin_unpin.png'),
    [FastCommentsImageAsset.ICON_PIN_SMALL]: require('./icons/pin.png'),
    [FastCommentsImageAsset.ICON_PIN_RED]: require('./icons/pin-red.png'),
    [FastCommentsImageAsset.ICON_EDIT_SMALL]: require('./icons/edit.png'),
    [FastCommentsImageAsset.ICON_EDIT_BIG]: require('./icons/edit.png'),
    [FastCommentsImageAsset.ICON_TRASH]: require('./icons/trash_thin.png'),
    [FastCommentsImageAsset.ICON_EYE]: require('./icons/view.png'),
    [FastCommentsImageAsset.ICON_EYE_SLASH]: require('./icons/view_hide.png'),
    [FastCommentsImageAsset.ICON_REPLIED]: require('./icons/replied.png'),
    [FastCommentsImageAsset.ICON_BOLD]: require('./icons/editor_bold.png'),
    [FastCommentsImageAsset.ICON_UNDERLINE]: require('./icons/editor_underline.png'),
    [FastCommentsImageAsset.ICON_ITALIC]: require('./icons/editor_itallic.png'),
    [FastCommentsImageAsset.ICON_STRIKETHROUGH]: require('./icons/editor_strike.png'),
    [FastCommentsImageAsset.ICON_CODE]: require('./icons/editor_embed.png'),
    [FastCommentsImageAsset.ICON_LINK]: require('./icons/editor_link.png'),
    [FastCommentsImageAsset.ICON_IMAGE_UPLOAD]: require('./icons/editor_image.png'),
    [FastCommentsImageAsset.ICON_RETURN]: require('./icons/return.png'),
    [FastCommentsImageAsset.ICON_GIF]: require('./icons/bell.png'),
    [FastCommentsImageAsset.ICON_IP]: require('./icons/ip.png'),
    [FastCommentsImageAsset.ICON_BELL]: require('./icons/bell.png'),
    [FastCommentsImageAsset.ICON_BELL_RED]: require('./icons/bell.png'),
    [FastCommentsImageAsset.ICON_BLOCK]: require('./icons/ban.png'),
    [FastCommentsImageAsset.ICON_FLAG]: require('./icons/flag.png'),
    [FastCommentsImageAsset.AVATAR_DEFAULT]: require('./avatars/unknown-person-v2.png'),
};