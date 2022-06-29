import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, Text} from "react-native";

export function CommentNotices(props: FastCommentsCommentWithState) {
    const {comment, state} = props;

    let notice = null, noticeStyles = null;

    if (state.commentState[comment._id]?.wasPostedCurrentSession) {
        if (comment.isSpam) {
            notice = state.translations.COMMENT_FLAGGED_SPAM;
            noticeStyles = styles.spamNotice;
        } else if (state.commentState[comment._id]?.requiresVerification) {
            notice = state.translations.COMMENT_AWAITING_VERIFICATION;
            noticeStyles = styles.requiresVerificationApprovalNotice;
        }
    }

    if (!notice && comment.approved === false) { // this is only false upon submission, normally it is undefined
        notice = state.translations.AWAITING_APPROVAL_COMMENT;
        noticeStyles = styles.awaitingApprovalNotice;
    }

    if (notice) {
        return <div style={noticeStyles}>{notice}</div>
    } else {
        return null;
    }
}

const styles = StyleSheet.create({
    spamNotice: {},
    requiresVerificationApprovalNotice: {},
    awaitingApprovalNotice: {}
});
