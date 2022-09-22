import {CommentViewProps} from "../components/comment";
import {RNComment} from "../types";

// Note - functions in this file contain unrolled loops and similar optimizations. Do not try to simplify without benchmarking.
function areCommentsDifferent(prevComment: RNComment, nextComment: RNComment) {
    // OPTIMIZATION: frequently changed things first
    // OPTIMIZATION: repliesHidden is handled inside the widget itself, so opening replies feels better.
    // OPTIMIZATION: replyBoxOpen is handled inside the widget itself, so opening reply box feels better.
    // OPTIMIZATION: votes is handled inside the widget itself, so voting feels better.

    // Adding/removing replies happens often. Have to re-render parents.
    if(prevComment._id === 'wIGW2BpsSHs') {
        console.log('??????????????? **************************', prevComment.children?.length, nextComment.children?.length)
    }
    if (prevComment.children?.length !== nextComment.children?.length) { // TODO submitting child replies is not updating the UI!
        if(prevComment._id === 'wIGW2BpsSHs') {
            console.log('**************************', prevComment.children?.length, nextComment.children?.length)
        }
        return true;
    }
    // comparing memory reference
    if (prevComment.children != nextComment.children) {
        if(prevComment._id === 'wIGW2BpsSHs') {
            console.log('**************************', prevComment.children?.length, nextComment.children?.length)
        }
        return true;
    }
    if (prevComment.isPinned !== nextComment.isPinned) {
        return true;
    }
    if (prevComment.isBlocked !== nextComment.isBlocked) {
        return true;
    }
    if (prevComment.isFlagged !== nextComment.isFlagged) {
        return true;
    }
    if (prevComment.hidden !== nextComment.hidden) {
        return true;
    }
    if (prevComment.hiddenChildrenCount !== nextComment.hiddenChildrenCount) {
        return true;
    }

    // Less frequently changed props below...

    if (prevComment.isDeleted !== nextComment.isDeleted) {
        return true;
    }
    if (prevComment.userId !== nextComment.userId) {
        return true;
    }
    if (prevComment.anonUserId !== nextComment.anonUserId) {
        return true;
    }
    if (prevComment.isByAdmin !== nextComment.isByAdmin) {
        return true;
    }
    if (prevComment.isByModerator !== nextComment.isByModerator) {
        return true;
    }
    if (prevComment.date !== nextComment.date) {
        return true;
    }
    if (prevComment.wasPostedCurrentSession !== nextComment.wasPostedCurrentSession) {
        return true
    }
    if (prevComment.isSpam !== nextComment.isSpam) {
        return true
    }
    if (prevComment.requiresVerification !== nextComment.requiresVerification) {
        return true
    }
    if (prevComment.approved !== nextComment.approved) {
        return true
    }
    if (prevComment.displayLabel !== nextComment.displayLabel) {
        return true;
    }
    if (prevComment.commenterName !== nextComment.commenterName) {
        return true;
    }
    if (prevComment.commenterLink !== nextComment.commenterLink) {
        return true;
    }
    if (prevComment.avatarSrc !== nextComment.avatarSrc) {
        return true;
    }
    if (prevComment.badges !== nextComment.badges) {
        return true;
    }
    if (prevComment.verified !== nextComment.verified) {
        return true;
    }
    if (prevComment.wasPostedCurrentSession !== nextComment.wasPostedCurrentSession) {
        return true;
    }
    if (prevComment.requiresVerification !== nextComment.requiresVerification) {
        return true;
    }
    if (prevComment.comment !== nextComment.comment) {
        return true;
    }
    if (prevComment.commentHTML !== nextComment.commentHTML) {
        return true;
    }
    if (prevComment._id !== nextComment._id) {
        return true;
    }

    return false;
}

export function arePropsEqual(prevProps: CommentViewProps, nextProps: CommentViewProps, checkConfig = true) {
    // console.log('HELP', prevProps.comment.children.get()?.length, nextProps.comment.children.get()?.length)
    const prevComment = prevProps.comment.get({stealth: true, noproxy: true});
    const nextComment = nextProps.comment.get({stealth: true, noproxy: true});

    if (areCommentsDifferent(prevComment, nextComment)) {
        return false;
    }
    if (nextComment.children) {
        for (let i = 0; i < nextComment.children.length; i++) {
            if (areCommentsDifferent(prevComment.children![i], nextComment.children[i])) {
                return false;
            }
        }
    }
    if (checkConfig) {
        const prevConfig = prevProps.state.config.get({stealth: true, noproxy: true});
        const nextConfig = nextProps.state.config.get({stealth: true, noproxy: true});
        if (prevConfig.renderCommentInline !== nextConfig.renderCommentInline) {
            return false;
        }
        if (prevConfig.usePressToEdit !== nextConfig.usePressToEdit) {
            return false;
        }
        if (prevConfig.readonly !== nextConfig.readonly) {
            return false;
        }
        if (prevConfig.renderDateBelowComment !== nextConfig.renderDateBelowComment) {
            return false;
        }
        if (prevConfig.hasDarkBackground !== nextConfig.hasDarkBackground) {
            return false;
        }
        if (prevConfig.renderLikesToRight !== nextConfig.renderLikesToRight) {
            return false;
        }
    }

    return true;
}
