import {IFastCommentsStyles} from "../types";
import {FastCommentsTheme} from "../types/fastcomments-theme";
import {StyleSheet, ViewStyle} from "react-native";
import {getLightTheme} from "./themes";

// The loading state is a sole, full-area render (the widget early-returns this
// while fetching). It must NOT be `position: absolute`: an absolutely-positioned
// sole child is out of flow, so its container collapses to 0 height, and on web
// (where the host's #root is not always a flex container that propagates height)
// a 0-height `inset: 0` box centers the spinner on y=0 - i.e. half off the top of
// the screen. Filling via normal flow (flex + a minHeight floor) centers it
// reliably on both web and native.
function getLoadingOverlay(t: FastCommentsTheme): ViewStyle {
    return {
        flex: 1,
        minHeight: 200,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.background + '50'
    };
}

/**
 * The entire default style tree is generated from semantic theme tokens; pass a
 * theme (getDarkTheme(), or resolveTheme({...}) for partial overrides) to
 * restyle every widget consistently. No theme means the light theme.
 */
export function getDefaultFastCommentsStyles(theme?: FastCommentsTheme): IFastCommentsStyles {
    const t = theme ?? getLightTheme();
    const LoadingOverlay = getLoadingOverlay(t);
    const hairline = StyleSheet.hairlineWidth;
    const modalShadow = {
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4
        },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5
    };
    const filledButton: ViewStyle = {
        backgroundColor: t.colors.primary,
        borderRadius: t.radius.md,
        paddingTop: t.spacing.sm + 2,
        paddingBottom: t.spacing.sm + 2,
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.lg
    };
    const surfaceButton: ViewStyle = {
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.md,
        paddingTop: t.spacing.sm + 2,
        paddingBottom: t.spacing.sm + 2,
        paddingLeft: t.spacing.lg,
        paddingRight: t.spacing.lg
    };
    return {
        root: {
            flex: 1,
            backgroundColor: t.colors.background
        },
        loadingOverlay: {
            ...LoadingOverlay
        },
        red: {
            color: t.colors.danger
        },
        threeDotMenu: {
            root: {
                minHeight: 36,
                minWidth: 36,
                justifyContent: 'center',
                alignItems: 'center',
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                marginRight: t.spacing.xs
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
                backgroundColor: t.colors.textSecondary,
                borderRadius: 4,
                marginTop: 0,
                marginRight: 2,
                marginBottom: 0,
                marginLeft: 2
            }
        },
        topArea: {
            // One shared gutter with the comment list below (commentsListContent).
            replyArea: {
                marginTop: t.spacing.lg,
                marginRight: t.spacing.lg,
                marginLeft: t.spacing.lg
            },
            separator: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingTop: t.spacing.sm,
                paddingBottom: t.spacing.sm,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                borderBottomWidth: hairline,
                borderColor: t.colors.border
            },
            commentCount: {
                alignSelf: 'center',
                fontWeight: t.fontWeight.semibold,
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary
            }
        },
        liveStatusBar: {
            root: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: t.spacing.sm,
                paddingBottom: t.spacing.sm,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                backgroundColor: t.colors.liveChatHeaderBackground
            },
            connectionChip: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm + 2,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface
            },
            connectionChipConnected: {
                backgroundColor: t.colors.surface
            },
            connectionChipDisconnected: {
                backgroundColor: t.colors.surface
            },
            connectionDot: {
                width: 8,
                height: 8,
                borderRadius: 4,
                marginRight: t.spacing.xs + 2
            },
            connectionDotConnected: {
                backgroundColor: t.colors.liveChatConnectedDot
            },
            connectionDotDisconnected: {
                backgroundColor: t.colors.liveChatDisconnectedDot
            },
            connectionText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.liveChatHeaderText
            },
            userCountChip: {
                marginLeft: t.spacing.sm,
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface
            },
            userCountText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.liveChatUserCountText
            }
        },
        bottomArea: {
            replyArea: {
                marginTop: t.spacing.lg,
                marginRight: t.spacing.md,
                marginLeft: t.spacing.md
            },
            separator: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                borderBottomWidth: hairline,
                borderColor: t.colors.border
            }
        },
        commentsWrapper: {
            paddingTop: t.spacing.xs,
            paddingLeft: 0,
            paddingRight: 0,
            backgroundColor: t.colors.background
        },
        commentsListContent: {
            paddingHorizontal: t.spacing.lg
        },
        comment: {
            root: {
                marginTop: t.spacing.lg
            },
            topRight: {
                position: "absolute",
                flexDirection: 'row',
                justifyContent: 'flex-end',
                top: 0,
                right: 0,
                zIndex: 1
            },
            displayDate: {
                alignSelf: 'center',
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary,
                textAlignVertical: 'center',
            },
            pin: {
                alignSelf: 'center',
                width: 18,
                height: 18,
            },
            emptyState: {
                padding: t.spacing.xl,
                alignItems: 'center'
            },
            emptyStateText: {
                color: t.colors.textSecondary,
                fontSize: t.fontSize.base
            },
            contentWrapper: {},
            text: {
                marginLeft: t.spacing.xs,
                marginTop: t.spacing.sm,
                fontSize: t.fontSize.body,
                lineHeight: 21,
                color: t.colors.textPrimary
            },
            // Inline formatting must be explicit: the engine's defaults for
            // these tags are lost on web, rendering bold/italic as plain text.
            textLinkStyles: {
                a: {
                    color: t.colors.link
                },
                b: { fontWeight: 'bold' },
                strong: { fontWeight: 'bold' },
                i: { fontStyle: 'italic' },
                em: { fontStyle: 'italic' },
                u: { textDecorationLine: 'underline' },
                s: { textDecorationLine: 'line-through' },
                strike: { textDecorationLine: 'line-through' },
                del: { textDecorationLine: 'line-through' },
                code: { fontFamily: 'monospace' }
            },
            HTMLNodeStyleByClass: {
                react: {
                    paddingRight: t.spacing.xs
                }
            },
            children: {
                marginTop: t.spacing.lg,
                marginRight: 0,
                marginBottom: 0,
                marginLeft: t.spacing.lg
            },
            childIndent: t.spacing.xl,
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
                margin: t.spacing.xl,
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                paddingTop: 35,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                paddingBottom: t.spacing.xl,
                alignItems: "center",
                ...modalShadow
            },
            modalCancel: {
                position: 'absolute',
                top: t.spacing.md,
                right: t.spacing.md
            },
            loadingView: {
                ...LoadingOverlay
            },
            saveButton: {
                marginTop: t.spacing.md
            }
        },
        commentAreaMessage: {
            wrapper: {
                flex: 1,
                minHeight: 140,
                paddingTop: 30,
                paddingBottom: 30,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radius.md
            },
            message: {
                paddingTop: t.spacing.sm + 2,
                paddingRight: t.spacing.lg,
                paddingBottom: t.spacing.sm + 2,
                paddingLeft: t.spacing.lg,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.surface,
                marginTop: 0,
                marginRight: "5%",
                marginBottom: 0,
                marginLeft: "5%",
            },
            messageText: {
                marginRight: t.spacing.sm,
                fontSize: t.fontSize.lg,
                fontWeight: t.fontWeight.medium,
                color: t.colors.textPrimary
            }
        },
        commentBottom: {
            root: {
                marginTop: t.spacing.sm,
                marginLeft: t.spacing.xs
            },
            replyAreaRoot: {
                marginTop: t.spacing.sm
            },
            commentBottomToolbar: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start'
            },
            commentBottomToolbarReply: {
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 36,
                marginLeft: t.spacing.lg,
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm
            },
            commentBottomToolbarReplyText: {
                marginLeft: t.spacing.xs,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.replyButton
            },
            commentBottomToolbarReplyIcon: {
                width: 15,
                height: 15
            }
        },
        commentNotices: {
            spamNotice: {
                paddingTop: t.spacing.lg,
                paddingRight: 0,
                paddingBottom: t.spacing.lg,
                paddingLeft: 0,
                fontSize: t.fontSize.base,
                color: t.colors.danger
            },
            requiresVerificationApprovalNotice: {
                paddingTop: t.spacing.lg,
                paddingRight: 0,
                paddingBottom: t.spacing.lg,
                paddingLeft: 0,
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            awaitingApprovalNotice: {
                paddingTop: t.spacing.lg,
                paddingRight: 0,
                paddingBottom: t.spacing.lg,
                paddingLeft: 0,
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            }
        },
        commentReplyToggle: {
            button: {
                flexDirection: 'row',
                alignItems: "center",
                justifyContent: 'flex-start',
                marginTop: t.spacing.sm,
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs
            },
            text: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.medium,
                color: t.colors.toggleRepliesButton
            },
            count: {
                color: t.colors.toggleRepliesButton
            },
            icon: {
                width: 18,
                aspectRatio: 1,
                resizeMode: 'contain',
                marginRight: t.spacing.xs
            },
        },
        commentTextArea: {
            textarea: {
                alignSelf: 'stretch',
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.inputBackground
            },
            placeholder: {
                position: 'absolute',
                padding: t.spacing.sm,
                color: t.colors.textSecondary
            },
            text: {
                color: t.colors.textPrimary,
                // Preview at the same size the posted comment body renders.
                fontSize: t.fontSize.body
            },
            toolbarRoot: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs
            },
            toolbarFormatButton: {
                minWidth: 32,
                alignItems: 'center',
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm,
                marginRight: t.spacing.xs,
                borderRadius: t.radius.sm,
                backgroundColor: t.colors.surface
            },
            toolbarFormatButtonActive: {
                backgroundColor: t.colors.pressed
            },
            toolbarFormatButtonText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.textPrimary
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
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                padding: 35,
                alignItems: "center",
                ...modalShadow
            },
            imageUploadModalProgressSpinnerSize: 100,
            imageUploadModalProgressText: {
                marginTop: t.spacing.sm,
                fontSize: t.fontSize.xl,
                fontWeight: t.fontWeight.bold,
                color: t.colors.textPrimary
            }
        },
        mentionPopup: {
            root: {
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.border,
                ...modalShadow
            },
            item: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: t.spacing.sm,
                paddingBottom: t.spacing.sm,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md
            },
            itemSelected: {
                backgroundColor: t.colors.pressed
            },
            itemText: {
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary
            },
            avatar: {
                width: 24,
                height: 24,
                borderRadius: t.radius.pill,
                marginRight: t.spacing.sm
            },
            loadingRow: {
                padding: t.spacing.md
            },
            loadingText: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            emptyRow: {
                padding: t.spacing.md
            },
            emptyText: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            }
        },
        commentTextAreaEmoticonBar: {
            root: {
                alignSelf: 'stretch',
                flexDirection: 'row',
                justifyContent: 'center',
                padding: t.spacing.sm,
            },
            button: {
                marginRight: t.spacing.xl,
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
                borderRadius: 10,
                backgroundColor: t.colors.onlineIndicator
            },
            offline: {
                position: "absolute",
                top: 6,
                right: 6,
                borderRadius: 10
            }
        },
        commentUserBadge: {
            imageBadge: {
                marginTop: 3,
                marginRight: t.spacing.xs,
                marginBottom: 0,
                marginLeft: 0,
                paddingTop: t.spacing.xs,
                paddingRight: t.spacing.xs + 3,
                paddingBottom: t.spacing.xs,
                paddingLeft: 0,
                borderRadius: t.radius.sm,
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
                marginRight: t.spacing.xs,
                marginBottom: 0,
                marginLeft: 0,
                paddingTop: t.spacing.xs,
                paddingRight: t.spacing.xs + 3,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.xs + 3,
                borderRadius: t.radius.sm,
                borderColor: "transparent",
                backgroundColor: "transparent"
            },
            textBadgeText: {
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary,
            }
        },
        commentUserInfo: {
            root: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            infoLeft: {
                marginRight: t.spacing.sm + 2
            },
            infoRight: {
                flexDirection: 'column',
                justifyContent: 'center'
            },
            label: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.medium,
                color: t.colors.textSecondary
            },
            username: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.textPrimary
            },
            usernameWithLink: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.link
            },
            avatarWrapper: {
                position: "relative",
                width: t.avatar.md,
                height: t.avatar.md,
                borderRadius: t.avatar.md
            },
            avatarWrapperDefault: {
                position: "relative",
                width: t.avatar.md,
                height: t.avatar.md,
                borderRadius: t.avatar.md,
                borderWidth: hairline,
                borderColor: t.colors.border,
                borderStyle: "solid",
                // The default avatar asset has transparency.
                backgroundColor: t.colors.surfaceRaised
            },
            avatarImage: {
                width: t.avatar.md,
                height: t.avatar.md,
                borderRadius: t.avatar.md,
            },
            avatarOnlineBadge: {
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: t.colors.background,
                backgroundColor: t.colors.onlineIndicator
            },
            avatarOfflineBadge: {
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 10,
                height: 10,
                borderRadius: 10,
                borderWidth: 2,
                borderColor: t.colors.background,
                backgroundColor: "transparent"
            }
        },
        commentUserInfoAsHTML: {},
        commentVote: {
            commentVoteOptions: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 0,
                marginRight: t.spacing.sm,
                marginBottom: 0,
                marginLeft: 2,
            },
            votesUpText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.voteCount,
                marginRight: t.spacing.xs
            },
            votesDownText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.voteCount,
                marginLeft: t.spacing.xs
            },
            votesZeroText: {
                color: t.colors.voteCountZero,
                fontWeight: t.fontWeight.regular
            },
            voteButton: {
                minHeight: 36,
                minWidth: 40,
                justifyContent: 'center',
                alignItems: 'center',
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface
            },
            voteButtonIcon: {
                height: 16,
                aspectRatio: 1,
                resizeMode: 'center'
            },
            voteDivider: {
                backgroundColor: t.colors.voteDivider,
                width: 1,
                height: 20,
                marginRight: t.spacing.sm,
                marginLeft: t.spacing.sm
            },
            commentVoteAuth: {
                maxWidth: 400,
                marginTop: t.spacing.sm,
                paddingTop: t.spacing.sm,
                paddingRight: t.spacing.md,
                paddingBottom: t.spacing.sm,
                paddingLeft: t.spacing.md,
                borderRadius: t.radius.md,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderStyle: "solid",
                backgroundColor: t.colors.surfaceRaised
            },
            voteAuthReasoning: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.textPrimary
            },
            authInput: {
                marginTop: t.spacing.sm,
                marginRight: 0,
                marginBottom: t.spacing.sm,
                marginLeft: 0,
                paddingTop: t.spacing.sm,
                paddingBottom: t.spacing.sm,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.inputBackground,
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary
            },
            loadingView: {
                ...LoadingOverlay
            },
            voteAuthButtons: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            },
            voteAwaitingVerificationMessage: {
                marginTop: t.spacing.sm,
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            voteError: {
                marginTop: t.spacing.sm,
                fontSize: t.fontSize.base,
                color: t.colors.danger
            },
        },
        modalMenu: {
            rootView: {
                flexDirection: 'row', // gets inline menu items like three-dot centered
            },
            centeredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                // Scrim: floating menus need separation from the page behind them.
                backgroundColor: '#00000055'
            },
            modalView: {
                margin: t.spacing.xl,
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                padding: t.spacing.xl,
                alignItems: "center",
                ...modalShadow
            },
            menuOptionButton: {
                flexDirection: 'row',
                minWidth: 100,
                justifyContent: 'flex-start',
                alignItems: 'center',
                marginBottom: t.spacing.sm,
                padding: t.spacing.sm + 2,
                borderRadius: t.radius.sm
            },
            menuOptionText: {
                paddingLeft: t.spacing.sm + 2,
                color: t.colors.textPrimary,
                fontSize: t.fontSize.body,
                fontWeight: t.fontWeight.semibold,
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
                top: t.spacing.md,
                right: t.spacing.md
            },
            loadingView: {
                ...LoadingOverlay
            }
        },
        notificationBell: {
            bellContainer: {
                width: 40,
                minHeight: 36,
                alignItems: "center",
                justifyContent: "center",
            },
            bellCount: {
                position: "absolute",
                top: -5,
                left: 24,
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            bellCountNonZero: {
                position: "absolute",
                top: -5,
                left: 24,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.danger
            }
        },
        notificationList: {
            centeredView: {
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            },
            root: {
                margin: t.spacing.xl,
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                padding: t.spacing.md,
                ...modalShadow
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
                marginRight: t.spacing.xs
            },
            subscriptionHeaderCheckBoxText: {},
            subscriptionHeaderText: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            notification: {
                marginTop: t.spacing.sm + 2,
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
                marginRight: t.spacing.sm + 2,
                borderRadius: t.radius.pill,
            },
            notificationDate: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            notificationMenu: {},
            notificationMenuButton: {
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
            },
            notificationBottom: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            notificationIsReadCircle: {
                width: 10,
                height: 10,
                borderRadius: 10,
                marginRight: t.spacing.xs,
                backgroundColor: t.colors.border,
            },
            notificationIsUnreadCircle: {
                width: 10,
                height: 10,
                borderRadius: 10,
                marginRight: t.spacing.xs,
                backgroundColor: t.colors.primary,
            },
        },
        paginationNext: {
            root: {
                flexDirection: 'row',
                paddingTop: t.spacing.xl,
                alignItems: 'center',
                justifyContent: 'space-around'
            },
            next: {
                paddingTop: t.spacing.sm + 2,
                paddingRight: t.spacing.xl,
                paddingBottom: t.spacing.sm + 2,
                paddingLeft: t.spacing.xl,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface,
                color: t.colors.loadMoreButtonText,
                fontWeight: t.fontWeight.semibold
            },
            nextHTMLStyles: {
                span: {
                    fontSize: 0 // display: 'none' not working in 5.x of render html lib???
                }
            },
            all: {
                paddingTop: t.spacing.sm + 2,
                paddingRight: t.spacing.xl,
                paddingBottom: t.spacing.sm + 2,
                paddingLeft: t.spacing.xl,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface,
                color: t.colors.loadMoreButtonText,
                fontWeight: t.fontWeight.semibold
            },
            allHTMLStyles: {
                span: {
                    fontWeight: t.fontWeight.bold
                }
            }
        },
        paginationPrev: {
            root: {
                paddingTop: t.spacing.xl,
            },
            text: {
                color: t.colors.loadMoreButtonText,
                fontWeight: t.fontWeight.semibold
            }
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
                // Scrim: the browser overlays the widget like a modal.
                backgroundColor: '#00000055'
            },
            modalView: {
                minWidth: 300,
                width: '94%',
                maxHeight: '85%',
                alignSelf: 'center',
                marginTop: t.spacing.xl,
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                paddingTop: 35,
                paddingLeft: t.spacing.md,
                paddingRight: t.spacing.md,
                paddingBottom: t.spacing.xl,
                alignItems: "flex-start",
                ...modalShadow
            },
            modalCancel: {
                position: 'absolute',
                top: t.spacing.md,
                right: t.spacing.md
            },
            modalCancelImage: {
                width: 16,
                height: 16
            },
            searchInput: {
                width: '100%',
                marginBottom: t.spacing.sm + 2,
                paddingTop: t.spacing.xs + 2,
                paddingBottom: t.spacing.xs + 2,
                paddingLeft: t.spacing.sm + 2,
                paddingRight: t.spacing.sm + 2,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.inputBackground
            },
            list: {
                width: '100%'
            },
            listImage: {
                width: '100%',
                marginBottom: t.spacing.sm,
                aspectRatio: 1,
                resizeMode: 'cover',
                borderRadius: t.radius.sm
            },
            noResultsMessage: {
                marginTop: t.spacing.sm,
                marginBottom: t.spacing.sm,
                textAlign: 'center',
                color: t.colors.textSecondary
            }
        },
        replyArea: {
            replyingTo: {
                marginBottom: t.spacing.xs,
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
                borderColor: t.colors.border,
                borderStyle: "solid",
                borderRadius: t.radius.md
            },
            ssoLoginButton: {
                flexDirection: 'row',
                alignItems: 'center',
                ...filledButton,
                paddingLeft: t.spacing.xl,
                paddingRight: t.spacing.xl
            },
            ssoLoginButtonText: {
                color: t.colors.onPrimary,
                fontWeight: t.fontWeight.semibold,
                textAlign: 'center',
                marginLeft: t.spacing.sm
            },
            topBar: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                minHeight: 25,
                marginTop: 0,
                marginRight: t.spacing.xl,
                marginBottom: t.spacing.lg,
                marginLeft: t.spacing.xl,
            },
            loggedInInfo: {
                flexDirection: 'row',
                alignItems: 'center',
                minWidth: 150
            },
            topBarAvatarWrapper: {
                height: t.avatar.sm,
                width: t.avatar.sm,
                marginRight: t.spacing.sm,
                borderRadius: t.avatar.sm,
                overflow: "hidden"
            },
            topBarAvatar: {
                height: t.avatar.sm,
                width: t.avatar.sm,
            },
            topBarUsername: {
                flexShrink: 1,
                fontWeight: t.fontWeight.bold,
                color: t.colors.textPrimary
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
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: t.spacing.lg,
                marginBottom: t.spacing.sm + 2,
                marginRight: 0,
                ...filledButton
            },
            replyButtonText: {
                color: t.colors.onPrimary,
                fontWeight: t.fontWeight.semibold,
                fontSize: t.fontSize.base
            },
            replyButtonIcon: {
                width: 22,
                height: 22,
                marginLeft: t.spacing.sm + 2,
                aspectRatio: 1,
                resizeMode: 'stretch'
            },
            inlineSubmitButton: {
                position: 'absolute',
                right: t.spacing.sm,
                top: t.spacing.sm,
                minWidth: 36,
                minHeight: 36,
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: t.radius.pill
            },
            inlineSubmitButtonIcon: {
                width: 20,
                height: 20,
                resizeMode: 'contain'
            },
            loadingView: {
                ...LoadingOverlay
            },
            error: {
                margin: t.spacing.xs,
                color: t.colors.danger
            },
            userInfoInput: {
                marginTop: t.spacing.sm + 2,
                marginRight: 0,
                marginBottom: t.spacing.sm + 2,
                marginLeft: 0,
                fontSize: t.fontSize.base
            },
            emailReasoning: {
                fontWeight: t.fontWeight.semibold,
                color: t.colors.textPrimary
            },
            authInput: {
                marginTop: t.spacing.sm + 2,
                paddingTop: t.spacing.sm + 1,
                paddingRight: t.spacing.md,
                paddingBottom: t.spacing.sm + 1,
                paddingLeft: t.spacing.md,
                borderRadius: t.radius.md,
                fontSize: t.fontSize.base,
                borderWidth: 1,
                borderColor: t.colors.border,
                borderStyle: "solid",
                backgroundColor: t.colors.inputBackground,
                color: t.colors.textPrimary
            },
            solicitationInfo: {
                marginTop: t.spacing.sm + 2,
                color: t.colors.textSecondary
            },
            authInputSubmit: {
                ...filledButton,
                paddingLeft: t.spacing.xl,
                paddingRight: t.spacing.xl
            },
            replyCancelButtonWrapper: {
                position: 'absolute',
                top: t.spacing.sm + 2,
                right: t.spacing.sm + 2
            },
            replyCancelButton: {
                paddingTop: t.spacing.sm + 2,
                paddingRight: t.spacing.sm + 2,
                paddingBottom: t.spacing.sm + 2,
                paddingLeft: t.spacing.sm + 2,
                borderRadius: t.radius.sm,
                backgroundColor: t.colors.surface
            }
        },
        selectSortDirection: {
            openButton: {
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 36,
                paddingTop: t.spacing.xs,
                paddingBottom: t.spacing.xs,
                paddingLeft: t.spacing.sm,
                paddingRight: t.spacing.sm,
            },
            text: {
                marginRight: t.spacing.xs,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.medium,
                color: t.colors.textSecondary
            },
            downCarrot: {
                position: 'relative',
                top: 1,
                borderTopWidth: 5,
                borderRightWidth: 5,
                borderBottomWidth: 0,
                borderLeftWidth: 5,
                borderTopColor: t.colors.textSecondary,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
            }
        },
        showHideCommentsToggle: {
            root: {
                backgroundColor: t.colors.primary,
                margin: t.spacing.xl,
                paddingTop: t.spacing.sm + 2,
                paddingRight: t.spacing.lg,
                paddingBottom: t.spacing.sm + 2,
                paddingLeft: t.spacing.lg,
                borderRadius: t.radius.md,
                alignContent: 'center',
                alignItems: 'center'
            },
            text: {
                marginTop: t.spacing.sm + 2,
                marginBottom: t.spacing.sm + 2,
                color: t.colors.onPrimary,
                fontSize: t.fontSize.body,
                fontWeight: t.fontWeight.semibold,
            }
        },
        showNewLiveComments: {
            button: {
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: t.spacing.xl,
                marginBottom: 0,
                paddingTop: t.spacing.xs + 2,
                paddingRight: t.spacing.md,
                paddingBottom: t.spacing.xs + 2,
                paddingLeft: t.spacing.md,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface
            },
            count: {
                minWidth: 20,
                marginRight: t.spacing.xs + 2,
                fontWeight: t.fontWeight.semibold,
                textAlign: 'center',
                fontSize: t.fontSize.base,
                color: t.colors.primary
            },
            text: {
                fontWeight: t.fontWeight.semibold,
                fontSize: t.fontSize.base,
                color: t.colors.primary
            }
        },
        liveChat: {
            root: {
                flex: 1,
                backgroundColor: t.colors.background
            },
            composerWrapper: {
                backgroundColor: t.colors.surface,
                borderTopWidth: hairline,
                borderColor: t.colors.border,
                padding: t.spacing.md
            }
        },
        pageReacts: {
            root: {
                marginTop: t.spacing.lg,
                marginLeft: t.spacing.lg,
                marginRight: t.spacing.lg
            },
            row: {
                flexDirection: 'row',
                alignItems: 'center'
            },
            react: {
                flexDirection: 'row',
                alignItems: 'center',
                marginRight: t.spacing.lg
            },
            reactButton: {
                minHeight: 36,
                minWidth: 36,
                justifyContent: 'center',
                alignItems: 'center'
            },
            reactImage: {
                width: 22,
                height: 22,
                resizeMode: 'contain'
            },
            countText: {
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.voteCount,
                marginRight: t.spacing.xs
            },
            usersText: {
                marginTop: t.spacing.xs,
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            }
        },
        feed: {
            root: {
                flex: 1,
                backgroundColor: t.colors.background
            },
            listContent: {
                paddingHorizontal: 0,
                paddingBottom: t.spacing.lg
            },
            emptyState: {
                padding: t.spacing.xl,
                alignItems: 'center'
            },
            emptyStateText: {
                color: t.colors.textSecondary,
                fontSize: t.fontSize.base
            },
            loadFailed: {
                padding: t.spacing.lg,
                alignItems: 'center'
            },
            loadFailedText: {
                color: t.colors.danger,
                fontSize: t.fontSize.base
            },
            newPostsBanner: {
                paddingVertical: t.spacing.sm + 2,
                paddingHorizontal: t.spacing.lg,
                backgroundColor: t.colors.primary,
                alignItems: 'center'
            },
            newPostsBannerText: {
                color: t.colors.onPrimary,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold
            },
            post: {
                paddingVertical: t.spacing.lg,
                paddingHorizontal: t.spacing.lg,
                borderBottomWidth: hairline,
                borderBottomColor: t.colors.border
            },
            postHeader: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: t.spacing.xs + 2
            },
            postTitle: {
                fontSize: t.fontSize.lg,
                fontWeight: t.fontWeight.semibold,
                color: t.colors.textPrimary,
                marginBottom: t.spacing.xs
            },
            postAuthor: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary,
                flexShrink: 1
            },
            followPill: {
                paddingVertical: t.spacing.xs,
                paddingHorizontal: t.spacing.md,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.primary,
                marginLeft: t.spacing.sm
            },
            followPillText: {
                color: t.colors.onPrimary,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold
            },
            followPillFollowing: {
                paddingVertical: t.spacing.xs,
                paddingHorizontal: t.spacing.md,
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: 'transparent',
                marginLeft: t.spacing.sm
            },
            followPillFollowingText: {
                color: t.colors.textSecondary,
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.semibold
            },
            postContent: {
                fontSize: t.fontSize.body,
                lineHeight: 21,
                color: t.colors.textPrimary,
                marginBottom: t.spacing.xs + 2
            },
            postDate: {
                fontSize: t.fontSize.base,
                color: t.colors.textSecondary
            },
            composer: {
                padding: t.spacing.md,
                borderTopWidth: hairline,
                borderTopColor: t.colors.border,
                backgroundColor: t.colors.surface
            },
            composerInputTitle: {
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                padding: t.spacing.sm + 2,
                marginBottom: t.spacing.sm,
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary,
                backgroundColor: t.colors.inputBackground
            },
            composerInput: {
                borderWidth: 1,
                borderColor: t.colors.border,
                borderRadius: t.radius.md,
                padding: t.spacing.sm + 2,
                minHeight: 60,
                marginBottom: t.spacing.sm,
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary,
                backgroundColor: t.colors.inputBackground
            },
            composerSubmit: {
                alignSelf: 'flex-end',
                paddingVertical: t.spacing.sm,
                paddingHorizontal: t.spacing.lg,
                backgroundColor: t.colors.primary,
                borderRadius: t.radius.md
            },
            composerSubmitText: {
                color: t.colors.onPrimary,
                fontWeight: t.fontWeight.semibold,
                fontSize: t.fontSize.base
            },
            composerSubmitDisabled: {
                backgroundColor: t.colors.pressed
            },
            customToolbar: {
                flexDirection: 'row',
                alignItems: 'center',
                marginTop: t.spacing.sm,
                flexWrap: 'wrap'
            },
            customToolbarButton: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: t.spacing.xs + 2,
                paddingHorizontal: t.spacing.sm + 2,
                marginRight: t.spacing.sm,
                borderRadius: t.radius.sm,
                backgroundColor: t.colors.surface
            },
            customToolbarButtonIcon: {
                width: 16,
                height: 16,
                marginRight: t.spacing.xs + 2,
                resizeMode: 'contain'
            },
            customToolbarButtonLabel: {
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary
            },
            composerMediaToolbar: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginBottom: t.spacing.sm
            },
            composerMediaAttachButton: {
                paddingVertical: t.spacing.xs + 2,
                paddingHorizontal: t.spacing.md,
                borderRadius: t.radius.md,
                backgroundColor: t.colors.surface
            },
            composerMediaAttachButtonText: {
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary
            },
            composerMediaPreviewStrip: {
                marginBottom: t.spacing.sm
            },
            composerMediaPreviewItem: {
                width: 80,
                height: 80,
                marginRight: t.spacing.sm,
                borderRadius: t.radius.sm,
                overflow: 'hidden',
                backgroundColor: t.colors.surface
            },
            composerMediaPreviewImage: {
                width: 80,
                height: 80,
                resizeMode: 'cover'
            },
            composerMediaPreviewRemoveButton: {
                position: 'absolute',
                top: 2,
                right: 2,
                paddingVertical: 2,
                paddingHorizontal: t.spacing.xs + 2,
                backgroundColor: 'rgba(0,0,0,0.6)',
                borderRadius: t.radius.pill
            },
            composerMediaPreviewRemoveText: {
                color: '#FFFFFF',
                fontSize: t.fontSize.base,
                fontWeight: t.fontWeight.bold
            },
            composerMediaPreviewProgress: {
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                paddingVertical: 2,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center'
            },
            composerMediaPreviewProgressText: {
                color: '#FFFFFF',
                fontSize: t.fontSize.base
            },
            composerMediaPreviewError: {
                fontSize: t.fontSize.base,
                color: t.colors.danger,
                marginBottom: t.spacing.xs
            },
            postMediaGallery: {
                marginTop: t.spacing.xs + 2,
                marginBottom: t.spacing.xs + 2
            },
            postMediaImage: {
                width: 200,
                height: 200,
                marginRight: t.spacing.sm,
                borderRadius: t.radius.md,
                resizeMode: 'cover'
            },
            reactionsRow: {
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                marginTop: t.spacing.sm
            },
            reactionChip: {
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: t.spacing.xs,
                paddingHorizontal: t.spacing.sm + 2,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface,
                marginRight: t.spacing.xs + 2,
                marginBottom: t.spacing.xs + 2
            },
            reactionChipActive: {
                backgroundColor: t.colors.pressed
            },
            reactionChipGlyph: {
                fontSize: t.fontSize.base,
                marginRight: t.spacing.xs
            },
            reactionChipCount: {
                fontSize: t.fontSize.base,
                color: t.colors.textPrimary,
                fontWeight: t.fontWeight.medium
            },
            reactionPickerButton: {
                paddingVertical: t.spacing.xs,
                paddingHorizontal: t.spacing.sm + 2,
                borderRadius: t.radius.pill,
                backgroundColor: t.colors.surface,
                marginRight: t.spacing.xs + 2,
                marginBottom: t.spacing.xs + 2
            },
            reactionPickerButtonText: {
                fontSize: t.fontSize.base,
                color: t.colors.primary,
                fontWeight: t.fontWeight.semibold
            },
            reactionPickerOverlay: {
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#00000055'
            },
            reactionPickerSheet: {
                flexDirection: 'row',
                paddingVertical: t.spacing.md,
                paddingHorizontal: t.spacing.lg,
                backgroundColor: t.colors.surfaceRaised,
                borderRadius: t.radius.lg,
                ...modalShadow
            },
            reactionPickerItem: {
                paddingVertical: t.spacing.xs + 2,
                paddingHorizontal: t.spacing.sm,
                marginHorizontal: 2
            },
            reactionPickerItemGlyph: {
                fontSize: 26
            }
        }
    };
}
