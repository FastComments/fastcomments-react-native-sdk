// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, Text, View} from "react-native";

export function CommentNotices({comment, state}: FastCommentsCommentWithState) {
    let notice = null, noticeStyles = null;

    if (state.commentState[comment._id.get()]?.wasPostedCurrentSession?.get()) {
        if (comment.isSpam.get()) {
            notice = state.translations.COMMENT_FLAGGED_SPAM.get();
            noticeStyles = styles.spamNotice;
        } else if (state.commentState[comment._id.get()]?.requiresVerification.get()) {
            notice = state.translations.COMMENT_AWAITING_VERIFICATION.get();
            noticeStyles = styles.requiresVerificationApprovalNotice;
        }
    }

    if (!notice && comment.approved.get() === false) { // this is only false upon submission, normally it is undefined
        notice = state.translations.AWAITING_APPROVAL_COMMENT.get();
        noticeStyles = styles.awaitingApprovalNotice;
    }

    if (notice) {
        return <View style={noticeStyles}><Text>notice</Text></View>
    } else {
        return null;
    }
}

const styles = StyleSheet.create({
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
});
