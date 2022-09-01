import {IFastCommentsStyles} from "../types/fastcomments-styles";

export const FastCommentsStyles: IFastCommentsStyles = {
    loading: {
        color: "red"
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
            "width": 4,
            "height": 4,
            "backgroundColor": "#333",
            "borderTopLeftRadius": 4,
            "borderTopRightRadius": 4,
            "borderBottomRightRadius": 4,
            "borderBottomLeftRadius": 4,
            "marginTop": 0,
            "marginRight": 2,
            "marginBottom": 0,
            "marginLeft": 2
        }
    },
    topArea: {
        replyArea: {
            "marginTop": 15,
            "marginRight": 15,
            "marginLeft": 15
        },
        separator: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingBottom: 5,
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
    commentsWrapper: {
        paddingTop: 15,
        paddingLeft: 15,
        paddingRight: 15,
    },
    comment: {
        root: {},
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
        contentWrapper: {
            marginLeft: 5,
            marginTop: 10,
            fontSize: 13
        },
        children: {
            "marginTop": 15,
            "marginRight": 0,
            "marginBottom": 0,
            "marginLeft": 15
        },
    },
    commentEditModal: {
        centeredView: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            marginTop: 22
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
            // TODO common
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff80'
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
            "paddingTop": 10,
            "paddingRight": 17,
            "paddingBottom": 10,
            "paddingLeft": 27,
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 7,
            "borderBottomRightRadius": 7,
            "borderBottomLeftRadius": 7,
            "backgroundColor": "#333",
            "marginTop": 0,
            "marginRight": "5%",
            "marginBottom": 0,
            "marginLeft": "5%",
        },
        messageText: {
            "marginRight": 10,
            "fontSize": 17,
            "fontWeight": "500",
        }
    },
    commentBottom: {
        root: {
            marginTop: 10,
            marginLeft: 5
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
    },
    commentNotices: {
        spamNotice: {
            "paddingTop": 15,
            "paddingRight": 0,
            "paddingBottom": 15,
            "paddingLeft": 0,
            "fontSize": 12,
            "color": "red"
        },
        requiresVerificationApprovalNotice: {
            "paddingTop": 15,
            "paddingRight": 0,
            "paddingBottom": 15,
            "paddingLeft": 0,
            "fontSize": 12,
        },
        awaitingApprovalNotice: {
            "paddingTop": 15,
            "paddingRight": 0,
            "paddingBottom": 15,
            "paddingLeft": 0,
            "fontSize": 12,
        }
    },
    commentReplyToggle: {
        button: {
            flexDirection: 'row',
            alignItems: "center",
            justifyContent: 'flex-start',
            marginTop: 10, // TODO move to consumer
            marginBottom: 10,
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
            color: '#000' // TODO don't use #000
        },
        toolbarButton: {
            height: 15,
            aspectRatio: 1,
            resizeMode: 'contain'
        }
    },
    commentUserActivityIcon: {
        online: {
            "position": "absolute",
            "top": 4,
            "right": 4,
            "borderTopLeftRadius": 10,
            "borderTopRightRadius": 10,
            "borderBottomRightRadius": 10,
            "borderBottomLeftRadius": 10,
        },
        offline: {
            "position": "absolute",
            "top": 4,
            "right": 4,
            "borderTopLeftRadius": 10,
            "borderTopRightRadius": 10,
            "borderBottomRightRadius": 10,
            "borderBottomLeftRadius": 10,
            "backgroundColor": "lime"
        }
    },
    commentUserBadge: {
        imageBadge: {
            "marginTop": 3,
            "marginRight": 5,
            "marginBottom": 0,
            "marginLeft": 0,
            "paddingTop": 5,
            "paddingRight": 7,
            "paddingBottom": 5,
            "paddingLeft": 7,
            "borderTopLeftRadius": 4,
            "borderTopRightRadius": 4,
            "borderBottomRightRadius": 4,
            "borderBottomLeftRadius": 4,
            "borderColor": "transparent",
            "backgroundColor": "transparent"
        },
        imageBadgeImage: {
            maxWidth: 22
        },
        textBadge: {
            "marginTop": 3,
            "marginRight": 5,
            "marginBottom": 0,
            "marginLeft": 0,
            "paddingTop": 5,
            "paddingRight": 7,
            "paddingBottom": 5,
            "paddingLeft": 7,
            "borderTopLeftRadius": 4,
            "borderTopRightRadius": 4,
            "borderBottomRightRadius": 4,
            "borderBottomLeftRadius": 4,
            "borderColor": "transparent",
            "backgroundColor": "transparent"
        },
        textBadgeText: {
            "fontSize": 12,
            "color": "#000",
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
        infoRight: {},
        label: {
            "fontSize": 10,
            "textTransform": "uppercase",
            "fontWeight": "500",
            "color": "#666666"
        },
        username: {
            "fontSize": 12,
            fontWeight: "500",
        },
        usernameWithLink: {
            "color": "#000",
            "textDecorationLine": "underline",
            "textDecorationColor": "black",
            "textDecorationStyle": "solid"
        },
        avatarWrapper: {
            "position": "relative",
            "width": 36,
            "height": 36,
            "overflow": "hidden",
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
            "position": "relative",
            "width": 36,
            "height": 36,
            "overflow": "hidden",
            borderRadius: 36,
            "borderWidth": 1,
            "borderColor": "#3f3f3f",
            "borderStyle": "solid",
            shadowRadius: 5,
            shadowColor: '#000',
            shadowOpacity: 1,
            shadowOffset: {
                width: 6,
                height: 3
            },
            elevation: 2
        },
        avatarImage: {
            width: 36,
            height: 36,
        }
    },
    commentVote: {
        commentVoteOptions: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            "marginTop": 0,
            "marginRight": 7,
            "marginBottom": 0,
            "marginLeft": 2,
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
            "marginTop": 10,
            "paddingTop": 9,
            "paddingRight": 12,
            "paddingBottom": 9,
            "paddingLeft": 12,
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 6,
            "borderBottomRightRadius": 6,
            "borderBottomLeftRadius": 6,
            "borderWidth": 1,
            "borderColor": "#a2a2a2",
            "borderStyle": "solid"
        },
        authInput: {
            "marginTop": 10,
            "marginRight": 0,
            "marginBottom": 10,
            "marginLeft": 0,
            "fontSize": 13
        },
        loadingView: {
            // TODO common
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff80'
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
        modalCancel: {
            position: 'absolute',
            top: 10,
            right: 10
        },
        loadingView: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff80'
        }
    },
    notificationBell: {
        bellContainer: {
            width: 35,
            alignItems: "center",
        },
        bellCount: {
            position: "absolute",
            top: 0,
            right: 0,
            fontSize: 11
        }
    },
    paginationNext: {
        root: {
            flexDirection: 'row',
            "marginTop": 50,
            alignItems: 'center'
        },
        next: {},
        all: {}
    },
    paginationPrev: {
        root: {
            "marginTop": 50,
        },
        text: {}
    },
    replyArea: {
        replyingTo: {
            marginBottom: 5,
        },
        ssoLoginWrapper: {
            flex: 1,
            "minHeight": 140,
            "paddingTop": 30,
            "paddingRight": 0,
            "paddingBottom": 30,
            "paddingLeft": 0,
            "alignItems": "center",
            "justifyContent": "center",
            "borderWidth": 1,
            "borderColor": "#bfbfbf",
            "borderStyle": "solid",
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 11,
            "borderBottomRightRadius": 11,
            "borderBottomLeftRadius": 11
        },
        ssoLoginButton: {
            "paddingTop": 10,
            "paddingRight": 17,
            "paddingBottom": 10,
            "paddingLeft": 27,
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 7,
            "borderBottomRightRadius": 7,
            "borderBottomLeftRadius": 7,
            "backgroundColor": "#333"
        },
        ssoLoginButtonText: {
            color: "#fff",
            fontWeight: '500',
            textAlign: 'center'
        },
        topBar: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            "minHeight": 25,
            "marginTop": 0,
            "marginRight": 26,
            "marginBottom": 15,
            "marginLeft": 26,
        },
        loggedInInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            // "width": "calc(100% - 60px)", // TODO
            "minWidth": 150
        },
        topBarAvatar: {
            "height": 25,
            "width": 25,
            "marginRight": 5,
            "borderTopLeftRadius": 25,
            "borderTopRightRadius": 25,
            "borderBottomRightRadius": 25,
            "borderBottomLeftRadius": 25,
            "overflow": "hidden"
            // TODO box shadow
        },
        topBarUsername: {
            // "maxWidth": "calc(50% - 25px)", // TODO
            "overflow": "scroll",
            "fontWeight": "700",
            flexWrap: 'nowrap'
        },
        topBarRight: {
            width: 100,
            alignItems: 'center',
            alignContent: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
        },
        commentInputArea: {},
        commentInputAreaReplySaving: {
            // animated-background
        },
        replyButtonWrapper: {
            alignItems: 'flex-end',
            justifyContent: 'space-between'
        },
        replyButton: { // TODO common button colors
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginTop: 15,
            marginBottom: 10,
            marginRight: 0,
            "paddingTop": 10,
            "paddingRight": 20,
            "paddingBottom": 10,
            "paddingLeft": 20,
            borderWidth: 1,
            borderRadius: 7,
            borderColor: "#a2a2a2",
            "backgroundColor": "#fbfbfb"
        },
        replyButtonText: {
            "color": "#333"
        },
        replyButtonIcon: {
            width: 22,
            height: 22,
            marginLeft: 10,
            aspectRatio: 1,
            resizeMode: 'stretch'
        },
        loadingView: {
            // TODO common
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff80'
        },
        error: {
            "margin": 5,
            "color": "#ff0000"
        },
        userInfoInput: {
            "marginTop": 10,
            "marginRight": 0,
            "marginBottom": 10,
            "marginLeft": 0,
            "fontSize": 13
        },
        emailReasoning: {
            fontWeight: '600'
        },
        authInput: {
            "marginTop": 10,
            "paddingTop": 9,
            "paddingRight": 12,
            "paddingBottom": 9,
            "paddingLeft": 12,
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 6,
            "borderBottomRightRadius": 6,
            "borderBottomLeftRadius": 6,
            "fontSize": 14,
            "borderWidth": 1,
            "borderColor": "#a2a2a2",
            "borderStyle": "solid"
        },
        solicitationInfo: {
            "marginTop": 10
        },
        authInputSubmit: {
            "paddingTop": 10,
            "paddingRight": 27,
            "paddingBottom": 10,
            "paddingLeft": 27,
            "borderTopLeftRadius": 0,
            "borderTopRightRadius": 7,
            "borderBottomRightRadius": 7,
            "borderBottomLeftRadius": 7,
            "backgroundColor": "#333"
        },
        replyCancelButtonWrapper: {
            position: 'absolute',
            top: 10,
            right: 10
        },
        replyCancelButton: {
            "paddingTop": 10,
            "paddingRight": 10,
            "paddingBottom": 10,
            "paddingLeft": 10,
            "borderWidth": 1,
            "borderTopLeftRadius": 4,
            "borderTopRightRadius": 4,
            "borderBottomRightRadius": 4,
            "borderBottomLeftRadius": 4,
            "borderColor": "#a2a2a2",
            "backgroundColor": "#fbfbfb"
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
            width: 14,
            aspectRatio: 1,
            resizeMode: 'contain'
        }
    },
    showHideCommentsToggle: {
        root: {
            flex: 1,
            backgroundColor: "#333",
            margin: 20,
            paddingTop: 10,
            paddingRight: 17,
            paddingBottom: 10,
            paddingLeft: 27,
            borderRadius: 7,
            elevation: 1
        },
        text: {
            "margin": "20px auto",
            "color": "#fff",
            "fontSize": 17,
            "fontWeight": "500",
        }
    },
    showNewLiveComments: {
        button: {
            flex: 1,
            "marginTop": 20,
            "marginRight": "auto",
            "marginBottom": 0,
            "marginLeft": "auto",
            "paddingTop": 5,
            "paddingRight": 10,
            "paddingBottom": 5,
            "paddingLeft": 10,
        },
        count: {
            "position": "relative",
            "top": 1,
            "minWidth": 12,
            "paddingTop": 2,
            "paddingRight": 5,
            "paddingBottom": 4,
            "paddingLeft": 5,
            "marginRight": 3,
            "borderWidth": 1,
            "borderColor": "#a2a2a2",
            "borderStyle": "solid",
            "borderTopLeftRadius": 4,
            "borderTopRightRadius": 0,
            "borderBottomRightRadius": 4,
            "borderBottomLeftRadius": 4,
            "fontWeight": "500",
        },
        text: {
            paddingBottom: 2,
            borderBottomWidth: 1,
            borderBottomColor: "#a3a3a3",
            fontWeight: "500",
        }
    }
};
