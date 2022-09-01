// use this if you want to use the default layout and layout mechanism

import {CommentAreaMessage} from "./comment-area-message";
import {ActivityIndicator, Text, View} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {CommentsList} from "./comments-list";
import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, {useEffect, useState} from 'react';
import RenderHtml from 'react-native-render-html';
import {useWindowDimensions} from 'react-native';
import {useHookstate, useHookstateEffect} from "@hookstate/core";
import {LiveCommentingTopArea} from "./live-commenting-top-area";
import {FastCommentsStyles} from "../resources";
import {IFastCommentsStyles, FastCommentsCallbacks} from "../types";
import {LiveCommentingBottomArea} from "./live-commenting-bottom-area";

export interface FastCommentsLiveCommentingProps {
    config: FastCommentsCommentWidgetConfig
    styles?: IFastCommentsStyles
    callbacks?: FastCommentsCallbacks
}

export function FastCommentsLiveCommenting({config, styles, callbacks}: FastCommentsLiveCommentingProps) {
    if (!styles) {
        styles = FastCommentsStyles;
    }
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}); // shallow clone is important to prevent extra re-renders
    const state = useHookstate(serviceInitialState);
    const service = new FastCommentsLiveCommentingService(state, callbacks);
    const [isLoading, setLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const {width} = useWindowDimensions();
    const loadAsync = async () => {
        setLoading(true);
        await service.fetchRemoteState(false);
        setLoading(false);
        setIsLoaded(true);
        callbacks?.onCommentsRendered && callbacks?.onCommentsRendered(state.commentsTree.get());
    }
    useEffect(() => {
        loadAsync();
    }, [config.sso?.userDataJSONBase64, config.simpleSSO?.username]); // watching whole config object causes duplicate renders.
    useHookstateEffect(() => {
        if (isLoaded) {
            loadAsync();
        }
    }, [state.sortDirection]);

    if (isLoading) {
        return <View style={styles.loading}><ActivityIndicator size="large"/></View>
    }

    if (state.blockingErrorMessage.get()) {
        return <View><CommentAreaMessage styles={styles} message={state.blockingErrorMessage.get()}/></View>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly.get() && (state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()))) {
        const paginationBeforeComments = state.commentsVisible.get() && state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles}/>
            : state.page.get() > 0 && !state.pagesLoaded.get().includes(state.page.get() - 1)
                ? <PaginationPrev state={state} styles={styles}/>
                : null;
        const paginationAfterComments = state.commentsVisible.get() && !state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles}/>
            : null;
        return <View>{
            state.hasBillingIssue.get() && state.isSiteAdmin.get() && <Text style={styles.red}>{state.translations.BILLING_INFO_INV.get()}</Text>
        }
            {
                state.isDemo.get() &&
                <Text style={styles.red}><RenderHtml source={{html: state.translations.DEMO_CREATE_ACCT.get()}} contentWidth={width}/></Text>
            }
            <LiveCommentingTopArea state={state} styles={styles}/>
            <View style={styles.commentsWrapper}>
                {paginationBeforeComments}
                {state.commentsVisible.get() && CommentsList({
                    state,
                    styles,
                    onVoteSuccess: callbacks?.onVoteSuccess,
                    onReplySuccess: callbacks?.onReplySuccess,
                    onAuthenticationChange: callbacks?.onAuthenticationChange
                })}
                {paginationAfterComments}
            </View>
            <LiveCommentingBottomArea state={state} styles={styles} />
        </View>;
    } else {
        return <View><CommentAreaMessage styles={styles} message={'todo'}/></View>;
    }
}

