// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {Text} from "react-native";

export function CommentNotices({comment, state, styles}: FastCommentsCommentWithState) {
    let notice = null, noticeStyles = null;

    if (comment.wasPostedCurrentSession?.get()) {
        if (comment.isSpam.get()) {
            notice = state.translations.COMMENT_FLAGGED_SPAM.get();
            noticeStyles = styles.commentNotices.spamNotice;
        } else if (comment.requiresVerification.get()) {
            notice = state.translations.COMMENT_AWAITING_VERIFICATION.get();
            noticeStyles = styles.commentNotices.requiresVerificationApprovalNotice;
        }
    }

    if (!notice && comment.approved.get() === false) { // this is only false upon submission, normally it is undefined
        notice = state.translations.AWAITING_APPROVAL_COMMENT.get();
        noticeStyles = styles.commentNotices.awaitingApprovalNotice;
    }

    if (notice) {
        return <Text style={noticeStyles}>{notice}</Text>
    } else {
        return null;
    }
}
