// use this if you want to use the default layout and layout mechanism

import {message} from "./message";
import {StyleSheet, Text, View} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {CommentsList} from "./comments-list";
import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, { useState } from 'react';

export function FastCommentsLiveCommenting({config}: { config: FastCommentsCommentWidgetConfig }) {
    const service = new FastCommentsLiveCommentingService(config);
    const [state, setState] = useState(service.getState());
    service.setStateCallback(setState);
    // noinspection JSIgnoredPromiseFromCall
    service.fetchRemoteState(false);

    if (state.blockingErrorMessage) {
        return <View>{message(state.blockingErrorMessage)}</View>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly && (state.config.hideCommentsUnderCountTextFormat || state.config.useShowCommentsToggle))) {
        const paginationBeforeComments = state.commentsVisible && state.config.paginationBeforeComments
            ? PaginationNext(state)
            : state.page > 0 && !state.pagesLoaded.includes(state.page - 1)
                ? PaginationPrev(state)
                : null;
        const paginationAfterComments = state.commentsVisible && !state.config.paginationBeforeComments
            ? PaginationNext(state)
            : null;
        return <View>{
                state.hasBillingIssue && state.isSiteAdmin && <Text style={styles.red}>{state.translations.BILLING_INFO_INV}</Text>
            }
            {
                state.isDemo && <Text style={styles.red}>{state.translations.DEMO_CREATE_ACCT}</Text>
            }
            <View style={styles.comments}>
                {paginationBeforeComments}
                {state.commentsVisible && CommentsList(state)}
            </View>
            {paginationAfterComments}
        </View>;
    } else {
        return <View>{message('todo')}</View>;
    }
}

const styles = StyleSheet.create({
    red: {
        color: "red"
    },
    comments: {

    }
});
