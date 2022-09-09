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

        // TODO textarea looks like vanillajs version
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
        renderDateBelowComment: true,
        enableInfiniteScrolling: true,
    });
    const erebusStyles: IFastCommentsStyles = {
        root: {
            flex: 1
        },
        commentsWrapper: {
            paddingBottom: 30
        },
        bottomArea: {
            root: {
                paddingBottom: 10
            }
        },
        replyArea: {
            replyingTo: {
                flexDirection: 'row',
                justifyContent: 'space-between'
            },
            replyingToCancelText: {
                color: '#fff',
                fontWeight: 'bold'
            },
            loggedInInfo: {
                minWidth: 'auto'
            },
            topBarUsername: {
                display: 'none'
            },
            topBarRight: {
                display: 'none'
            },
            topBarAndInputArea: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            },
            topBar: {
                "minHeight": 'auto',
                "marginTop": 0,
                "marginRight": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                flexGrow: 0,
            },
            commentInputArea: {
                "marginTop": 0,
                "marginRight": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                flexGrow: 2,
                flexShrink: 2, // keeps long text from pushing submit button away
            },
            replyButton: {
                alignSelf: 'flex-start',
                "marginTop": 0,
                "marginRight": 0,
                "marginBottom": 0,
                "marginLeft": 0,
                height: 40,
                flexGrow: 0,
                borderLeftWidth: 0,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
            },
            replyButtonText: {
                fontSize: 13,
                fontWeight: 'bold'
            },
            replyButtonIcon: {
                display: 'none'
            }
        },
        commentTextArea: {
            textarea: {
                height: 40,
                paddingRight: 0,
                borderRightWidth: 0,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                overflow: 'scroll'
            }
        },
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
            displayDate: {
                marginRight: 10
            }
        },
        commentUserInfo: {
            label: {
                color: '#fff'
            },
            avatarWrapper: {
                width: 25,
                height: 25,
                borderRadius: 25,
            },
            avatarWrapperDefault: {
                width: 25,
                height: 25,
                borderRadius: 25,
            },
            avatarImage: {
                width: 25,
                height: 25,
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
            },
            commentBottomToolbar: {
                flexDirection: 'row',
                justifyContent: 'flex-start'
            },
            commentBottomToolbarReplyText: {
                fontWeight: 'normal',
                fontSize: 12
            },
            commentBottomToolbarReplyIcon: {
                display: 'none'
            }
        },
        commentReplyToggle: {
            icon: {},
            text: {
                fontSize: 11
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
