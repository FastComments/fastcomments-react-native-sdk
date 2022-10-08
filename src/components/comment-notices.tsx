import {Text} from "react-native";
import {IFastCommentsStyles, RNComment} from "../types";

export interface CommentNoticesProps {
    comment: RNComment
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

export function CommentNotices({comment, styles, translations}: CommentNoticesProps) {
    let notice = null, noticeStyles = null;

    if (comment.wasPostedCurrentSession) {
        if (comment.isSpam) {
            notice = translations.COMMENT_FLAGGED_SPAM;
            noticeStyles = styles.commentNotices?.spamNotice;
        } else if (comment.requiresVerification) {
            notice = translations.COMMENT_AWAITING_VERIFICATION;
            noticeStyles = styles.commentNotices?.requiresVerificationApprovalNotice;
        }
    }

    if (!notice && comment.approved === false) { // this is only false upon submission, normally it is undefined
        notice = translations.AWAITING_APPROVAL_COMMENT;
        noticeStyles = styles.commentNotices?.awaitingApprovalNotice;
    }

    if (notice) {
        return <Text style={noticeStyles}>{notice}</Text>
    } else {
        return null;
    }
}
