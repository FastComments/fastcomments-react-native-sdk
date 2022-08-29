// use this if you want to use the default layout and layout mechanism

import {CommentAreaMessage} from "./comment-area-message";
import {ActivityIndicator, StyleSheet, Text, View} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {CommentsList} from "./comments-list";
import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, {useEffect, useState} from 'react';
import RenderHtml from 'react-native-render-html';
import {useWindowDimensions} from 'react-native';
import {useHookstate} from "@hookstate/core";
import {LiveCommentingTopArea} from "./live-commenting-top-area";

export function FastCommentsLiveCommenting({config}: { config: FastCommentsCommentWidgetConfig }) {
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}); // shallow clone is important to prevent extra re-renders
    const state = useHookstate(serviceInitialState);
    const service = new FastCommentsLiveCommentingService(state);
    const [isLoading, setLoading] = useState(true);
    const {width} = useWindowDimensions();
    useEffect(() => {
        (async () => {
            await service.fetchRemoteState(false);
            setLoading(false);
        })();
    }, [config]);

    if (isLoading) {
        return <View style={styles.loading}><ActivityIndicator size="large" /></View>
    }

    if (state.blockingErrorMessage.get()) {
        return <View><CommentAreaMessage message={state.blockingErrorMessage.get()} />}</View>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly.get() && (state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()))) {
        const paginationBeforeComments = state.commentsVisible.get() && state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} />
            : state.page.get() > 0 && !state.pagesLoaded.get().includes(state.page.get() - 1)
                ? <PaginationPrev state={state} />
                : null;
        const paginationAfterComments = state.commentsVisible.get() && !state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} />
            : null;
        return <View>{
            state.hasBillingIssue.get() && state.isSiteAdmin.get() && <Text style={styles.red}>{state.translations.BILLING_INFO_INV.get()}</Text>
        }
            {
                state.isDemo.get() &&
                <Text style={styles.red}><RenderHtml source={{html: state.translations.DEMO_CREATE_ACCT.get()}} contentWidth={width}/></Text>
            }
            <LiveCommentingTopArea state={state}/>
            <View style={styles.comments}>
                {paginationBeforeComments}
                {state.commentsVisible.get() && CommentsList(state)}
            </View>
            {paginationAfterComments}
        </View>;
    } else {
        return <View><CommentAreaMessage message={'todo'}/></View>;
    }
}

const styles = StyleSheet.create({
    red: {
        color: "red"
    },
    loading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    comments: {}
});
