import {CommentViewProps} from "../components/comment";
import {RNComment} from "../types";

// Note - functions in this file contain unrolled loops and similar optimizations. Do not try to simplify without benchmarking.
function areCommentsDifferent(prevComment: RNComment, nextComment: RNComment) {
    // OPTIMIZATION: frequently changed things first
    // Showing/hiding replies happens often.
    if (prevComment.repliesHidden !== nextComment.repliesHidden) {
        return true;
    }
    if (prevComment.replyBoxOpen !== nextComment.replyBoxOpen) {
        return true;
    }
    // We don't need to also check votesUp and votesDown since we always change votes
    // Voting up happens often.
    if (prevComment.votes !== nextComment.votes) {
        return true;
    }
    // Adding/removing replies happens often. Have to re-render parents.
    if (prevComment.children?.length !== nextComment.children?.length) {
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

export function shouldCommentReRender(prevProps: CommentViewProps, nextProps: CommentViewProps, checkConfig = true) {
    const prevComment = prevProps.comment.get({stealth: true, noproxy: true});
    const nextComment = nextProps.comment.get({stealth: true, noproxy: true});

    if (areCommentsDifferent(prevComment, nextComment)) {
        return true;
    }
    if (nextComment.children) {
        for (let i = 0; i < nextComment.children.length; i++) {
            if (areCommentsDifferent(prevComment.children![i], nextComment.children[i])) {
                return true;
            }
        }
    }
    if (checkConfig) {
        const prevConfig = prevProps.state.config.get({stealth: true, noproxy: true});
        const nextConfig = nextProps.state.config.get({stealth: true, noproxy: true});
        if (prevConfig.renderCommentInline !== nextConfig.renderCommentInline) {
            return true;
        }
        if (prevConfig.usePressToEdit !== nextConfig.usePressToEdit) {
            return true;
        }
        if (prevConfig.readonly !== nextConfig.readonly) {
            return true;
        }
        if (prevConfig.renderDateBelowComment !== nextConfig.renderDateBelowComment) {
            return true;
        }
        if (prevConfig.hasDarkBackground !== nextConfig.hasDarkBackground) {
            return true;
        }
        if (prevConfig.renderLikesToRight !== nextConfig.renderLikesToRight) {
            return true;
        }
    }

    return false;
}
