// use this if you want to use the default layout and layout mechanism

import {FastCommentsState} from "../types/fastcomments-state";
import {message} from "./message";
import {StyleSheet, Text} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {CommentsList} from "./comments-list";

export function FastCommentsLiveCommenting(state: FastCommentsState) {
    if (state.blockingErrorMessage) {
        return <div>{message(state.blockingErrorMessage)}</div>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly && (state.config.hideCommentsUnderCountTextFormat || state.config.useShowCommentsToggle))) {
        const paginationBeforeComments = state.commentsVisible && state.config.paginationBeforeComments
            ? PaginationNext(state)
            : state.page > 0 && !state.pagesLoaded.includes(state.page - 1)
                ? PaginationPrev(state)
                : null;
        const paginationAfterComments = state.commentsVisible && !state.config.paginationBeforeComments
            ? PaginationNext(state)
            : null;
        return <div>
            {
                state.hasBillingIssue && state.isSiteAdmin && <Text style={styles.red}>{state.translations.BILLING_INFO_INV}</Text>
            }
            {
                state.isDemo && <Text style={styles.red}>{state.translations.DEMO_CREATE_ACCT}</Text>
            }
            <div style={styles.comments}>
                {paginationBeforeComments}
                {CommentsList(state)}
            </div>
            {paginationAfterComments}
        </div>;
    }
}

const styles = StyleSheet.create({
    red: {
        color: "red"
    },
    comments: {

    }
});
