import {CommentViewProps} from "../components/comment";
import {RNComment} from "../types";
import {State} from "@hookstate/core";

// Yeah this is terrible but I can't get the previous version of the comment via hookstate as by the time React.memo calls the
// prop comparison method both prevProps and nextProps hold a State object which contains a reference to the latest version and
// passing the "raw" version of the object around causes the state library to trigger extra excessive renders.
// So a global count it is.
const CommentChangeCounter: Record<string, number> = {
    // Global state nightmares go here.
}

// Note - functions in this file contain unrolled loops and similar optimizations. Do not try to simplify without benchmarking.
function areCommentsDifferent(prevComment: RNComment, nextComment: RNComment) {
    // OPTIMIZATION: frequently changed things first
    // OPTIMIZATION: replyBoxOpen is handled inside the widget itself, so opening reply box feels better.
    // OPTIMIZATION: votes is handled inside the widget itself, so voting feels better.

    // This isn't very react-esque but it works, is fairly fast, and allows us to use memoized components with usehookstate
    // This is due to prev/next objects being a ref to the same object that hook state "ownes", so normal
    // prev/next comparison of objects w/ React.memo doesn't work.
    if (CommentChangeCounter[nextComment._id] !== nextComment.changeCounter) {
        // Update global state in prop comparison to make functional people mad.
        CommentChangeCounter[nextComment._id] = nextComment.changeCounter || 1;
        return true;
    }

    if (prevComment.repliesHidden !== nextComment.repliesHidden) {
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

export function incChangeCounter(comment: RNComment) {
    comment.changeCounter = comment.changeCounter ? comment.changeCounter + 1 : 1;
}

export function incChangeCounterState(comment: State<RNComment>) {
    comment.changeCounter.set((changeCounter) => changeCounter ? changeCounter + 1 : 1);
}

export function arePropsEqual(prevProps: CommentViewProps, nextProps: CommentViewProps, checkConfig = true) {
    // console.log('HELP', prevProps.comment.comment, nextProps.comment.comment)
    const prevComment = prevProps.comment;
    const nextComment = nextProps.comment;

    if (areCommentsDifferent(prevComment, nextComment)) {
        return false;
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
