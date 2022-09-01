import {ImageStyle, TextStyle, ViewStyle} from "react-native";
import {MixedStyleDeclaration} from "react-native-render-html";

export interface IFastCommentsStyles {
    loading: TextStyle
    red: TextStyle
    threeDotMenu: {
        root: ViewStyle
        dots: ViewStyle
        dot: ViewStyle
    }
    topArea: {
        replyArea: ViewStyle,
        separator: ViewStyle,
        commentCount: TextStyle,
    },
    bottomArea: {
        replyArea: ViewStyle,
        separator: ViewStyle,
    },
    commentsWrapper?: ViewStyle
    comment: {
        root: ViewStyle
        topRight: ViewStyle
        displayDate: TextStyle
        pin: ImageStyle
        contentWrapper: MixedStyleDeclaration
        children: ViewStyle
    }
    commentEditModal: {
        centeredView: ViewStyle
        modalView: ViewStyle
        modalCancel: ViewStyle
        loadingView: ViewStyle
        saveButton: ViewStyle
    }
    commentAreaMessage: {
        wrapper: ViewStyle
        message: ViewStyle
        messageText: TextStyle
    }
    commentBottom: {
        root: ViewStyle
        commentBottomToolbar: ViewStyle
        commentBottomToolbarReply: ViewStyle
        commentBottomToolbarReplyText: TextStyle
    }
    commentNotices: {
        spamNotice: TextStyle
        requiresVerificationApprovalNotice: TextStyle
        awaitingApprovalNotice: TextStyle
    }
    commentReplyToggle: {
        text: TextStyle
        count: TextStyle
        button: ViewStyle
        icon: ImageStyle
    }
    commentTextArea: {
        textarea: ViewStyle
        placeholder: TextStyle
        toolbarButton: ImageStyle
    }
    commentUserActivityIcon: {
        online: ViewStyle
        offline: ViewStyle
    }
    commentUserBadge: {
        imageBadge: ViewStyle
        imageBadgeImage: ImageStyle
        textBadge: ViewStyle
        textBadgeText: TextStyle
    }
    commentUserInfo: {
        label: TextStyle
        usernameWithLink: TextStyle
        username: TextStyle
        avatarWrapperDefault: ViewStyle
        avatarWrapper: ViewStyle
        avatarImage: ImageStyle
        root: ViewStyle
        infoLeft: ViewStyle
        infoRight: ViewStyle
    }
    commentVote: {
        commentVoteOptions: ViewStyle
        votesUpText: TextStyle
        voteButton: ViewStyle
        voteButtonIcon: ImageStyle
        voteDivider: ViewStyle
        votesDownText: TextStyle
        commentVoteAuth: ViewStyle
        authInput: TextStyle
        voteAuthButtons: ViewStyle
        voteAwaitingVerificationMessage: TextStyle
        voteError: TextStyle
        loadingView: ViewStyle
    }
    modalMenu: {
        rootView: ViewStyle
        centeredView: ViewStyle
        modalView: ViewStyle
        menuOptionButton: ViewStyle
        menuOptionText: TextStyle
        modalCancel: ViewStyle
        loadingView: ViewStyle
    }
    notificationBell: {
        bellContainer: ViewStyle
        bellCount: TextStyle
    }
    paginationNext: {
        root: ViewStyle
        next: MixedStyleDeclaration
        all: MixedStyleDeclaration
    },
    paginationPrev: {
        root: ViewStyle,
        text: MixedStyleDeclaration
    }
    replyArea: {
        replyingTo: ViewStyle
        ssoLoginWrapper: ViewStyle
        ssoLoginButton: ViewStyle
        ssoLoginButtonText: TextStyle
        topBar: ViewStyle
        loggedInInfo: ViewStyle
        topBarAvatar: ImageStyle
        topBarUsername: TextStyle
        topBarRight: ViewStyle
        commentInputArea: ViewStyle
        commentInputAreaReplySaving: ViewStyle
        replyButtonWrapper: ViewStyle
        replyButton: ViewStyle
        replyButtonText: TextStyle
        replyButtonIcon: ImageStyle
        loadingView: ViewStyle
        error: TextStyle
        userInfoInput: TextStyle
        emailReasoning: TextStyle
        authInput: TextStyle
        solicitationInfo: TextStyle
        authInputSubmit: ViewStyle
        replyCancelButtonWrapper: ViewStyle
        replyCancelButton: ViewStyle
    },
    selectSortDirection: {
        openButton: ViewStyle
        text: TextStyle
        downCarrot: ImageStyle
    },
    showHideCommentsToggle: {
        root: ViewStyle
        text: TextStyle
    },
    showNewLiveComments: {
        button: ViewStyle,
        count: TextStyle,
        text: TextStyle
    }
}
