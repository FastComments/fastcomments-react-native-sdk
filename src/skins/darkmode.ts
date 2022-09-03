import {IFastCommentsStyles} from "../types";
import {assign, defaultsDeep, merge} from "lodash";
import {FastCommentsRNConfig} from "../types/react-native-config";

export function setupDarkModeSkin(config: FastCommentsRNConfig, styles: IFastCommentsStyles) {
    defaultsDeep(config, {
        hasDarkBackground: true
    });
    const DarkStyles: IFastCommentsStyles = {
        root: {
            backgroundColor: '#14181f'
        },
        loading: {
            color: "red"
        },
        red: {
            color: 'red'
        },
        threeDotMenu: {
            dot: {
                "backgroundColor": "#333",
            }
        },
        topArea: {
            replyArea: {
            },
            separator: {
                borderColor: '#afafaf'
            },
            commentCount: {
                color: '#fff'
            }
        },
        bottomArea: {
            replyArea: {},
            separator: {
                borderColor: '#afafaf'
            }
        },
        commentsWrapper: {},
        comment: {
            root: {},
            topRight: {},
            displayDate: {
                color: '#fff',
            },
            pin: {
                // TODO grayscale/different image?
            },
            text: {
                color: '#fff',
            },
            children: {},
        },
        commentEditModal: {
            centeredView: {},
            modalView: {
                backgroundColor: "#14181f",
                shadowColor: "#ffffff",
                elevation: 7
            },
            modalCancel: {},
            loadingView: {
                backgroundColor: '#14181f80'
            },
            saveButton: {
                marginTop: 10
            },
            saveButtonText: {
                color: '#fff',
            }
        },
        commentAreaMessage: {
            wrapper: {},
            message: {
                "backgroundColor": "#333",
            },
            messageText: {}
        },
        commentBottom: {
            root: {},
            replyAreaRoot: {
            },
            commentBottomToolbar: {},
            commentBottomToolbarReply: {},
            commentBottomToolbarReplyText: {
                color: '#fff'
            },
        },
        commentNotices: {
            spamNotice: {},
            requiresVerificationApprovalNotice: {},
            awaitingApprovalNotice: {
                color: '#fff'
            }
        },
        commentReplyToggle: {
            button: {},
            text: {
                color: '#fff',
                fontSize: 12
            },
            count: {},
            icon: {},
        },
        commentTextArea: {
            textarea: {
                borderColor: '#a2a2a2',
            },
            placeholder: {
                color: '#fff',
            },
            text: {
                color: '#fff',
            },
            toolbarButton: {}
        },
        commentUserActivityIcon: {
            online: {},
            offline: {
                "backgroundColor": "lime"
            }
        },
        commentUserBadge: {
            imageBadge: {},
            imageBadgeImage: {},
            textBadge: {},
            textBadgeText: {}
        },
        commentUserInfo: {
            root: {},
            infoLeft: {},
            infoRight: {},
            label: {
                "color": "#666666"
            },
            username: {
                color: '#fff'
            },
            usernameWithLink: {
                "color": "#fff",
            },
            avatarWrapper: {
                shadowColor: '#333',
            },
            avatarWrapperDefault: {
                "borderColor": "#3f3f3f",
                shadowColor: '#333',
            },
            avatarImage: {}
        },
        commentVote: {
            commentVoteOptions: {},
            votesUpText: {
                color: '#fff'
            },
            votesDownText: {
                color: '#fff'
            },
            voteButton: {},
            voteButtonIcon: {},
            voteDivider: {
                backgroundColor: '#6c6c6c',
            },
            commentVoteAuth: {},
            authInput: {
                color: '#fff',
            },
            loadingView: {
                backgroundColor: '#ffffff50'
            },
            voteAuthButtons: {},
            voteAwaitingVerificationMessage: {},
            voteError: {},
        },
        modalMenu: {
            rootView: {},
            centeredView: {},
            modalView: {
                backgroundColor: "#14181f",
                shadowColor: "#ffffff",
                elevation: 7
            },
            menuOptionButton: {},
            menuOptionText: {
                color: "#fff",
            },
            modalCancel: {},
            loadingView: {}
        },
        notificationBell: {
            bellContainer: {
                // TODO grayscale/different image?
            },
            bellCount: {
                color: '#fff'
            }
        },
        paginationNext: {
            root: {},
            next: {
                color: '#fff'
            },
            all: {
                color: '#fff'
            }
        },
        paginationPrev: {
            root: {},
            text: {
                color: '#fff'
            }
        },
        replyArea: {
            replyingTo: {},
            replyingToText: {
                color: '#fff',
            },
            ssoLoginWrapper: {},
            ssoLoginButton: {},
            ssoLoginButtonText: {},
            topBar: {},
            loggedInInfo: {},
            topBarAvatar: {},
            topBarUsername: {
                color: '#fff',
            },
            topBarRight: {},
            commentInputArea: {},
            commentInputAreaReplySaving: {},
            replyButtonWrapper: {},
            replyButton: {
                borderColor: '#a2a2a2',
                backgroundColor: 'transparent'
            },
            replyButtonText: {
                "color": "#fff"
            },
            replyButtonIcon: {},
            loadingView: {},
            error: {
                "color": "#ff0000"
            },
            userInfoInput: {},
            emailReasoning: {},
            authInput: {},
            solicitationInfo: {},
            authInputSubmit: {},
            replyCancelButtonWrapper: {},
            replyCancelButton: {}
        },
        selectSortDirection: {
            openButton: {},
            text: {
                color: '#fff',
            },
            downCarrot: {
                borderTopColor: '#fff'
            }
        },
        showHideCommentsToggle: {
            root: {
            },
            text: {
                color: '#fff',
            }
        },
        showNewLiveComments: {
            button: {
            },
            count: {
            },
            text: {
            }
        }
    };

    assign(styles, merge(styles, DarkStyles));
}
