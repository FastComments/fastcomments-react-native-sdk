// use this if you want to use the default layout and layout mechanism

import {message} from "./message";
import {StyleSheet, Text, View} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {CommentsList} from "./comments-list";
import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, {useEffect} from 'react';
import RenderHtml from 'react-native-render-html';
import { useWindowDimensions } from 'react-native';
import {useHookstate} from "@hookstate/core";

export function FastCommentsLiveCommenting({config}: { config: FastCommentsCommentWidgetConfig }) {
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}); // shallow clone is important to prevent extra re-renders
    const state = useHookstate(serviceInitialState);
    const service = new FastCommentsLiveCommentingService(state);
    useEffect(() => {
        // noinspection JSIgnoredPromiseFromCall
        service.fetchRemoteState(false);
    }, [config]);

    if (state.blockingErrorMessage.get()) {
        return <View>{message(state.blockingErrorMessage.get())}</View>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly.get() && (state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()))) {
        const paginationBeforeComments = state.commentsVisible.get() && state.config.paginationBeforeComments.get()
            ? PaginationNext(state)
            : state.page.get() > 0 && !state.pagesLoaded.get().includes(state.page.get() - 1)
                ? PaginationPrev(state)
                : null;
        const paginationAfterComments = state.commentsVisible.get() && !state.config.paginationBeforeComments.get()
            ? PaginationNext(state)
            : null;
        const { width } = useWindowDimensions();
        return <View>{
            state.hasBillingIssue.get() && state.isSiteAdmin.get() && <Text style={styles.red}>{state.translations.BILLING_INFO_INV.get()}</Text>
        }
            {
                state.isDemo.get() && <Text style={styles.red}><RenderHtml source={{html: state.translations.DEMO_CREATE_ACCT.get()}} contentWidth={width}/></Text>
            }
            <View style={styles.comments}>
                {paginationBeforeComments}
                {/*{state.commentsVisible && CommentsList(state)}*/}
                <Text>{state.commentsTree.length}</Text>
                {CommentsList(state)}
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
    comments: {}
});
