import {FastCommentsCallbacks, FastCommentsImageAsset, IFastCommentsStyles, ImageAssetConfig} from "../types";
import {assign, defaultsDeep, merge} from "lodash";
import {setupDarkModeSkin} from "./darkmode";
import {FastCommentsRNConfig} from "../types/react-native-config";

export function setupErebusDarkSkin(config: FastCommentsRNConfig, styles: IFastCommentsStyles, assets: ImageAssetConfig, _callbacks: FastCommentsCallbacks) {
    setupDarkModeSkin(config, styles);
    defaultsDeep(config, {
        translations: {
            DAYS_AGO: '[v]d',
            WEEKS_AGO: '[v]w',
            MONTHS_AGO: '[v]m',
            YEARS_AGO: '[v]y',
        },

        inlineReactImages: [
            'https://cdn.fastcomments.com/images/fireworks.png',
            'https://cdn.fastcomments.com/images/party-popper.png',
            'https://cdn.fastcomments.com/images/star-64-filled.png',
        ],

        // TODO render dates under comment text
        // TODO textarea looks like vanillajs version
        // TODO textarea is fixed at bottom and comments list scrolls
        // TODO pagination
        useSingleReplyField: true,
        disableToolbar: true,
        disableSuccessMessage: true,
        useSingleLineCommentInput: true,
        hasDarkBackground: true,
        disableEmailInputs: true,
        disableNotificationBell: true,
        disableUnverifiedLabel: true,
        inputAfterComments: true,
        newCommentsToBottom: true,
        collapseReplies: true,
        usePressToEdit: true,
        scrollComments: true,
        disableDownVoting: true,
        renderLikesToRight: true,
        // TODO doesn't work
        // renderCommentInline: true,
    });
    const erebusStyles: IFastCommentsStyles = {
        comment: {
            subRoot: {},
            contentWrapper: {
                // TODO trying to get inline rendering w/ text wrap working
                // flexDirection: 'row',
                // alignItems: 'center'
            },
            text: {
                marginLeft: 5,
                marginTop: 10,
                color: '#fff',
                maxWidth: '90%'
            },
            // textHTML: 'color: #fff;'
        },
        commentUserInfo: {
            label: {
                color: '#fff'
            }
        },
        // commentUserInfoAsHTML: {
        //     root: `display: inline-block; flex-direction: row; flex-wrap: wrap;`,
        //     infoLeft: `display: inline-block;`,
        //     infoRight: `display: inline-block;`,
        //     label: `color: #fff;`,
        //     username: 'margin-right: 5px; color: #fff;',
        //     avatarWrapper: `display: inline-block; margin-right: 5px; width: 25px; height: 25px; border-radius: 25px; overflow: hidden; `,
        //     avatarWrapperDefault: `display: inline-block; margin-right: 5px; width: 25px; height: 25px; border-radius: 25px; overflow: hidden; `,
        //     avatarImage: `display: inline-block; width: 25px; height: 25px; border-radius: 25px; object-fit: cover;`
        // },
        commentBottom: {
            root: {
                flex: 1
            }
        },
        commentVote: {
            root: {position: 'absolute', right: 0, top: '50%'}
        }
    }
    assign(styles, merge(styles, erebusStyles));
    assign(assets, {
        [FastCommentsImageAsset.ICON_UP]: require('./../resources/icons/heart.png'),
        [FastCommentsImageAsset.ICON_UP_ACTIVE]: require('./../resources/icons/heart_active.png'),
        [FastCommentsImageAsset.ICON_UP_ACTIVE_WHITE]: require('./../resources/icons/heart_active.png'),
    });
}
