import {IFastCommentsStyles} from "../types";
import {ViewStyle} from "react-native";

const LoadingOverlay: ViewStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff50'
}

const GreyButton = {
    borderWidth: 1,
    borderColor: "#a2a2a2",
    backgroundColor: "#fbfbfb"
}

export function getDefaultFastCommentsStyles(): IFastCommentsStyles {
    return {
        root: {
            flex: 1
        },
        loadingOverlay: {
            ...LoadingOverlay
        },
        red: {
            color: 'red'
        },
        threeDotMenu: {
            root: {
                paddingTop: 5,
                paddingBottom: 5,
                marginRight: 5
            },
            dots: {
                flexDirection: 'row',
                alignItems: "center",
                alignContent: 'center',
                justifyContent: 'space-between'
            },
            dot: {
                width: 4,
                height: 4,
                backgroundColor: "#333",
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 4,
                marginTop: 0,
                marginRight: 2,
                marginBottom: 0,
                marginLeft: 2
            }
        },
        topArea: {
            replyArea: {
                marginTop: 15,
                marginRight: 7.5,
                marginLeft: 7.5
            },
            separator: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: 3,
                paddingBottom: 3,
                paddingLeft: 10,
                paddingRight: 10,
                borderBottomWidth: 1,
                borderColor: '#afafaf'
            },
            commentCount: {
                alignSelf: 'center',
                fontWeight: '500',
                fontSize: 12
            }
        },
        bottomArea: {
            replyArea: {
                marginTop: 15,
                marginRight: 7.5,
                marginLeft: 7.5
            },
            separator: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingBottom: 5,
                paddingLeft: 10,
                paddingRight: 10,
                borderBottomWidth: 1,
                borderColor: '#afafaf'
            }
        },
        commentsWrapper: {
            paddingTop: 5,
            paddingLeft: 0,
            paddingRight: 0,
        },
        commentsListContent: {
            paddingHorizontal: 7.5,
        },
        comment: {
            root: {
                marginTop: 10
            },
            topRight: {
                position: "absolute",
                flexDirection: 'row',
                // alignItems: 'center',
                justifyContent: 'flex-end',
                top: 0,
                right: 0,
                zIndex: 1
            },
            displayDate: {
                alignSelf: 'center',
                fontSize: 12,
                textAlignVertical: 'center',
            },
            pin: {
                alignSelf: 'center',
                width: 18,
                height: 18,
            },
            contentWrapper: {},
            text: {
                marginLeft: 5,
                marginTop: 10,
                fontSize: 13,
            },
            HTMLNodeStyleByClass: {
                react: {
                    paddingRight: 5
                }
            },
            children: {
                marginTop: 15,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: 15
            },
        },
        commentMenu: {
            itemIcon: {
                width: 24,
                height: 24,
                aspectRatio: 1,
                resizeMode: 'contain'
            }
        },
        commentEditModal: {
            centeredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                marginTop: 22
            },
            modalView: {
                width: '100%',
                minWidth: 300,
                margin: 20,
                backgroundColor: "white",
                borderRadius: 20,
                paddingTop: 35,
                paddingLeft: 10,
                paddingRight: 10,
                paddingBottom: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
            },
            modalCancel: {
                position: 'absolute',
                top: 10,
                right: 10
            },
            loadingView: {
                ...LoadingOverlay
            },
            saveButton: {
                marginTop: 10
            }
        },
        commentAreaMessage: {
            wrapper: {
                flex: 1,
                minHeight: '140px',
                padding: '30px 0',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottomStartRadius: 0,
                borderBottomLeftRadius: 11,
                borderBottomRightRadius: 11,
                borderBottomEndRadius: 11
            },
            message: {
                paddingTop: 10,
                paddingRight: 17,
                paddingBottom: 10,
                paddingLeft: 27,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 7,
                borderBottomRightRadius: 7,
                borderBottomLeftRadius: 7,
                backgroundColor: "#333",
                marginTop: 0,
                marginRight: "5%",
                marginBottom: 0,
                marginLeft: "5%",
            },
            messageText: {
                marginRight: 10,
                fontSize: 17,
                fontWeight: "500",
            }
        },
        commentBottom: {
            root: {
                marginTop: 10,
                marginLeft: 5
            },
            replyAreaRoot: {
                marginTop: 10
            },
            commentBottomToolbar: {
                flexDirection: 'row',
                justifyContent: 'space-between'
            },
            commentBottomToolbarReply: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            commentBottomToolbarReplyText: {
                marginLeft: 5
            },
            commentBottomToolbarReplyIcon: {
                width: 15,
                height: 15
            }
        },
        commentNotices: {
            spamNotice: {
                paddingTop: 15,
                paddingRight: 0,
                paddingBottom: 15,
                paddingLeft: 0,
                fontSize: 12,
                color: "red"
            },
            requiresVerificationApprovalNotice: {
                paddingTop: 15,
                paddingRight: 0,
                paddingBottom: 15,
                paddingLeft: 0,
                fontSize: 12,
            },
            awaitingApprovalNotice: {
                paddingTop: 15,
                paddingRight: 0,
                paddingBottom: 15,
                paddingLeft: 0,
                fontSize: 12,
            }
        },
        commentReplyToggle: {
            button: {
                flexDirection: 'row',
                alignItems: "center",
                justifyContent: 'flex-start',
                marginTop: 10,
            },
            text: {
                fontSize: 12
            },
            count: {},
            icon: {
                width: 18,
                aspectRatio: 1,
                resizeMode: 'contain',
                marginRight: 5
            },
        },
        commentTextArea: {
            textarea: {
                alignSelf: 'stretch',
                borderWidth: 1,
                borderColor: 'black',
                borderRadius: 11
            },
            placeholder: {
                position: 'absolute',
                padding: 8,
                color: '#000'
            },
            toolbarButton: {
                height: 18,
                aspectRatio: 1,
                resizeMode: 'contain'
            },
            imageUploadModalCenteredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center"
            },
            imageUploadModalContent: {
                backgroundColor: "white",
                borderRadius: 20,
                padding: 35,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
            },
            imageUploadModalProgressSpinnerSize: 100,
            imageUploadModalProgressText: {
                marginTop: 10,
                fontSize: 20,
                fontWeight: 'bold'
            }
        },
        commentTextAreaEmoticonBar: {
            root: {
                alignSelf: 'stretch',
                flexDirection: 'row',
                justifyContent: 'center',
                padding: 10,
            },
            button: {
                marginRight: 20,
            },
            icon: {
                height: 20,
                aspectRatio: 1,
                resizeMode: 'contain'
            }
        },
        commentUserActivityIcon: {
            online: {
                position: "absolute",
                top: 6,
                right: 6,
                width: 4,
                height: 4,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
                borderBottomLeftRadius: 10,
                backgroundColor: "lime"
            },
            offline: {
                position: "absolute",
                top: 6,
                right: 6,
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                borderBottomRightRadius: 10,
                borderBottomLeftRadius: 10
            }
        },
        commentUserBadge: {
            imageBadge: {
                marginTop: 3,
                marginRight: 5,
                marginBottom: 0,
                marginLeft: 0,
                paddingTop: 5,
                paddingRight: 7,
                paddingBottom: 5,
                paddingLeft: 0,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 4,
                borderColor: "transparent",
                backgroundColor: "transparent"
            },
            imageBadgeImage: {
                width: 22,
                aspectRatio: 1,
                resizeMode: 'contain',
            },
            textBadge: {
                marginTop: 3,
                marginRight: 5,
                marginBottom: 0,
                marginLeft: 0,
                paddingTop: 5,
                paddingRight: 7,
                paddingBottom: 5,
                paddingLeft: 7,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 4,
                borderColor: "transparent",
                backgroundColor: "transparent"
            },
            textBadgeText: {
                fontSize: 12,
                color: "#000",
            }
        },
        commentUserInfo: {
            root: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            infoLeft: {
                marginRight: 7
            },
            infoRight: {
                flexDirection: 'column',
                justifyContent: 'center'
            },
            label: {
                fontSize: 10,
                textTransform: "uppercase",
                fontWeight: "500",
                color: "#666666"
            },
            username: {
                fontSize: 12,
                fontWeight: "500",
            },
            usernameWithLink: {
                color: "#000",
                textDecorationLine: "underline",
                textDecorationColor: "black",
                textDecorationStyle: "solid"
            },
            avatarWrapper: {
                position: "relative",
                width: 36,
                height: 36,
                overflow: "hidden",
                borderRadius: 36,
                shadowRadius: 5,
                shadowColor: '#000',
                shadowOpacity: 1,
                shadowOffset: {
                    width: 6,
                    height: 3
                },
                elevation: 2
            },
            avatarWrapperDefault: {
                position: "relative",
                width: 36,
                height: 36,
                overflow: "hidden",
                borderRadius: 36,
                borderWidth: 1,
                borderColor: "#3f3f3f",
                borderStyle: "solid",
                shadowRadius: 5,
                shadowColor: '#000',
                shadowOpacity: 1,
                shadowOffset: {
                    width: 6,
                    height: 3
                },
                elevation: 2,
                // otherwise the elevation causes the image to appear too dark since the default image has some transparency
                backgroundColor: '#fff'
            },
            avatarImage: {
                width: 36,
                height: 36,
            }
        },
        commentUserInfoAsHTML: {},
        commentVote: {
            commentVoteOptions: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 0,
                marginRight: 7,
                marginBottom: 0,
                marginLeft: 2,
            },
            votesUpText: {
                fontSize: 12,
                marginRight: 5
            },
            votesDownText: {
                fontSize: 12,
                marginLeft: 5
            },
            voteButton: {
                height: 22,
                justifyContent: 'center'
            },
            voteButtonIcon: {
                height: 12,
                aspectRatio: 1,
                resizeMode: 'center'
            },
            voteDivider: {
                backgroundColor: '#c2c2c2',
                width: 1,
                height: 20,
                marginRight: 10,
                marginLeft: 10
            },
            commentVoteAuth: {
                maxWidth: 400,
                marginTop: 10,
                paddingTop: 9,
                paddingRight: 12,
                paddingBottom: 9,
                paddingLeft: 12,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
                borderBottomLeftRadius: 6,
                borderWidth: 1,
                borderColor: "#a2a2a2",
                borderStyle: "solid"
            },
            authInput: {
                marginTop: 10,
                marginRight: 0,
                marginBottom: 10,
                marginLeft: 0,
                fontSize: 13
            },
            loadingView: {
                ...LoadingOverlay
            },
            voteAuthButtons: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            },
            voteAwaitingVerificationMessage: {},
            voteError: {},
        },
        modalMenu: {
            rootView: {
                flexDirection: 'row', // gets inline menu items like three-dot centered
            },
            centeredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center"
            },
            modalView: {
                margin: 20,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 35,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
            },
            menuOptionButton: {
                flexDirection: 'row',
                minWidth: 100,
                justifyContent: 'flex-start',
                alignItems: 'center',
                marginBottom: 10,
                padding: 10,
                elevation: 2,
            },
            menuOptionText: {
                paddingLeft: 10,
                color: "black",
                fontWeight: "bold",
                textAlign: "left"
            },
            menuCancelIcon: {
                width: 16,
                height: 16,
                aspectRatio: 1,
                resizeMode: 'contain'
            },
            modalCancel: {
                position: 'absolute',
                top: 10,
                right: 10
            },
            loadingView: {
                ...LoadingOverlay
            }
        },
        notificationBell: {
            bellContainer: {
                width: 35,
                alignItems: "center",
            },
            bellCount: {
                position: "absolute",
                top: -3,
                left: 26,
                fontSize: 11
            },
            bellCountNonZero: {
                position: "absolute",
                top: -3,
                left: 26,
                fontSize: 11,
                color: 'red'
            }
        },
        notificationList: {
            centeredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            },
            root: {
                margin: 20,
                backgroundColor: "white",
                borderRadius: 20,
                padding: 10,
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
            },
            closeButton: {
                position: 'absolute',
                top: 30,
                right: 30
            },
            closeButtonImage: {
                width: 16,
                height: 16,
            },
            subscriptionHeader: {},
            subscriptionHeaderCheckBox: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            subscriptionHeaderCheckBoxImage: {
                width: 22,
                height: 22,
                marginRight: 5
            },
            subscriptionHeaderCheckBoxText: {},
            subscriptionHeaderText: {
                fontSize: 12
            },
            notification: {
                marginTop: 10,
                flexDirection: 'column',
                alignItems: 'flex-start'
            },
            notificationTop: {
                flexDirection: 'row',
                alignItems: 'center',
            },
            notificationTopTouchable: {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
            },
            notificationTextWrapper: {
                alignItems: 'flex-start',
            },
            notificationAvatar: {
                width: 32,
                height: 32,
                marginRight: 10,
                borderTopLeftRadius: 25,
                borderTopRightRadius: 25,
                borderBottomRightRadius: 25,
                borderBottomLeftRadius: 25,
            },
            notificationDate: {
                fontSize: 12
            },
            notificationMenu: {},
            notificationMenuButton: {
                paddingTop: 5,
                paddingBottom: 5,
            },
            notificationBottom: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            notificationIsReadCircle: {
                width: 10,
                height: 10,
                borderRadius: 10,
                marginRight: 5,
                backgroundColor: "lightgrey",
            },
            notificationIsUnreadCircle: {
                width: 10,
                height: 10,
                borderRadius: 10,
                marginRight: 5,
                backgroundColor: "#2fccff",
            },
        },
        paginationNext: {
            root: {
                flexDirection: 'row',
                paddingTop: 50,
                alignItems: 'center',
                justifyContent: 'space-around'
            },
            next: {
                paddingTop: 10,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
                borderRadius: 7,
                ...GreyButton
            },
            nextHTMLStyles: {
                span: {
                    fontSize: 0 // display: 'none' not working in 5.x of render html lib???
                }
            },
            all: {
                paddingTop: 10,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
                borderRadius: 7,
                ...GreyButton
            },
            allHTMLStyles: {
                span: {
                    fontWeight: 'bold'
                }
            }
        },
        paginationPrev: {
            root: {
                paddingTop: 50,
            },
            text: {}
        },
        gifBrowser: {
            centeredView: {
                position: 'absolute',
                top: 0,
                left: 0,
                flex: 1,
                width: '100%',
                height: '100%',
                justifyContent: "flex-start", // top of the screen feels better than the center
            },
            modalView: {
                minWidth: 300,
                margin: 20,
                backgroundColor: "white",
                borderRadius: 20,
                paddingTop: 35,
                paddingLeft: 10,
                paddingRight: 10,
                paddingBottom: 20,
                alignItems: "flex-start",
                shadowColor: "#000",
                shadowOffset: {
                    width: 0,
                    height: 2
                },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5
            },
            modalCancel: {
                position: 'absolute',
                top: 10,
                right: 10
            },
            modalCancelImage: {
                width: 16,
                height: 16
            },
            searchInput: {
                width: '100%',
                marginBottom: 10,
                paddingTop: 5,
                paddingBottom: 5,
                borderWidth: 1,
                borderColor: '#000',
                borderRadius: 10
            },
            list: {
                width: '100%'
            },
            listImage: {
                marginBottom: 5,
                aspectRatio: 1,
                resizeMode: 'stretch',
                borderWidth: 1,
                borderColor: 'red'
            },
            noResultsMessage: {
                marginTop: 10,
                marginBottom: 10,
                textAlign: 'center'
            }
        },
        replyArea: {
            replyingTo: {
                marginBottom: 5,
            },
            ssoLoginWrapper: {
                flex: 1,
                minHeight: 140,
                paddingTop: 30,
                paddingRight: 0,
                paddingBottom: 30,
                paddingLeft: 0,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#bfbfbf",
                borderStyle: "solid",
                borderTopLeftRadius: 0,
                borderTopRightRadius: 11,
                borderBottomRightRadius: 11,
                borderBottomLeftRadius: 11
            },
            ssoLoginButton: {
                paddingTop: 10,
                paddingRight: 17,
                paddingBottom: 10,
                paddingLeft: 27,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 7,
                borderBottomRightRadius: 7,
                borderBottomLeftRadius: 7,
                backgroundColor: "#333"
            },
            ssoLoginButtonText: {
                color: "#fff",
                fontWeight: '500',
                textAlign: 'center'
            },
            topBar: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 25,
                marginTop: 0,
                marginRight: 26,
                marginBottom: 15,
                marginLeft: 26,
            },
            loggedInInfo: {
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 150
            },
            topBarAvatarWrapper: {
                height: 25,
                width: 25,
                marginRight: 5,
                borderRadius: 25,
                overflow: "hidden",
                shadowRadius: 5,
                shadowColor: '#000',
                shadowOpacity: 1,
                shadowOffset: {
                    width: 6,
                    height: 3
                },
                elevation: 2
            },
            topBarAvatar: {
                height: 25,
                width: 25,
            },
            topBarUsername: {
                overflow: "scroll",
                fontWeight: "700",
                flexWrap: 'nowrap'
            },
            topBarRight: {
                alignItems: 'center',
                alignContent: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                alignSelf: 'flex-end',
            },
            commentInputArea: {},
            commentInputAreaReplySaving: {
                // animated-background
            },
            replyButtonWrapper: {
                alignItems: 'flex-end',
                justifyContent: 'space-between'
            },
            replyButton: {
                flexDirection: 'row',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginTop: 15,
                marginBottom: 10,
                marginRight: 0,
                paddingTop: 10,
                paddingRight: 20,
                paddingBottom: 10,
                paddingLeft: 20,
                borderRadius: 7,
                ...GreyButton
            },
            replyButtonText: {
                color: "#333"
            },
            replyButtonIcon: {
                width: 22,
                height: 22,
                marginLeft: 10,
                aspectRatio: 1,
                resizeMode: 'stretch'
            },
            loadingView: {
                ...LoadingOverlay
            },
            error: {
                margin: 5,
                color: "#ff0000"
            },
            userInfoInput: {
                marginTop: 10,
                marginRight: 0,
                marginBottom: 10,
                marginLeft: 0,
                fontSize: 13
            },
            emailReasoning: {
                fontWeight: '600'
            },
            authInput: {
                marginTop: 10,
                paddingTop: 9,
                paddingRight: 12,
                paddingBottom: 9,
                paddingLeft: 12,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 6,
                borderBottomRightRadius: 6,
                borderBottomLeftRadius: 6,
                fontSize: 14,
                borderWidth: 1,
                borderColor: "#a2a2a2",
                borderStyle: "solid"
            },
            solicitationInfo: {
                marginTop: 10
            },
            authInputSubmit: {
                paddingTop: 10,
                paddingRight: 27,
                paddingBottom: 10,
                paddingLeft: 27,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 7,
                borderBottomRightRadius: 7,
                borderBottomLeftRadius: 7,
                backgroundColor: "#333"
            },
            replyCancelButtonWrapper: {
                position: 'absolute',
                top: 10,
                right: 10
            },
            replyCancelButton: {
                paddingTop: 10,
                paddingRight: 10,
                paddingBottom: 10,
                paddingLeft: 10,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 4,
                ...GreyButton
            }
        },
        selectSortDirection: {
            openButton: {
                flexDirection: 'row',
                alignItems: 'center',
                padding: 5,
            },
            text: {
                marginRight: 5,
                fontSize: 12,
                fontWeight: '500'
            },
            downCarrot: {
                position: 'relative',
                top: 1,
                borderTopWidth: 5,
                borderRightWidth: 5,
                borderBottomWidth: 0,
                borderLeftWidth: 5,
                borderTopColor: "#000",
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
            }
        },
        showHideCommentsToggle: {
            root: {
                backgroundColor: "#333",
                margin: 20,
                paddingTop: 10,
                paddingRight: 17,
                paddingBottom: 10,
                paddingLeft: 27,
                borderRadius: 7,
                alignContent: 'center',
                alignItems: 'center',
                elevation: 1,
            },
            text: {
                marginTop: 10,
                marginBottom: 10,
                color: "#fff",
                fontSize: 16,
                fontWeight: "500",
            }
        },
        showNewLiveComments: {
            button: {
                alignSelf: 'center',
                flexDirection: 'row',
                marginTop: 20,
                marginBottom: 0,
                paddingTop: 5,
                paddingRight: 10,
                paddingBottom: 5,
                paddingLeft: 10,
            },
            count: {
                minWidth: 20,
                paddingRight: 5,
                paddingLeft: 5,
                marginRight: 6,
                borderWidth: 1,
                borderColor: '#a2a2a2',
                borderStyle: 'solid',
                borderTopLeftRadius: 4,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 4,
                borderBottomLeftRadius: 4,
                fontWeight: '500',
                textAlign: 'center',
                fontSize: 13
            },
            text: {
                paddingBottom: 2,
                borderBottomWidth: 1,
                borderBottomColor: '#a3a3a3',
                fontWeight: '500',
                fontSize: 12
            }
        }
    };
}
