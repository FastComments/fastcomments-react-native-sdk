// use this if you want to use the default layout and layout mechanism

import {CommentAreaMessage} from "./comment-area-message";
import {ActivityIndicator, BackHandler, FlatList, ListRenderItemInfo, Text, View} from "react-native";
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, {useEffect, useRef, useState} from 'react';
import RenderHtml, {RenderHTMLConfigProvider, TRenderEngineProvider} from 'react-native-render-html';
import {useWindowDimensions} from 'react-native';
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {LiveCommentingTopArea} from "./live-commenting-top-area";
import {IFastCommentsStyles, FastCommentsCallbacks, RNComment, ImageAssetConfig} from "../types";
import {CallbackObserver, LiveCommentingBottomArea} from "./live-commenting-bottom-area";
import {getDefaultFastCommentsStyles} from "../resources";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {FastCommentsCommentView} from "./comment";
import {canPaginateNext, paginateNext} from "../services/pagination";

export interface FastCommentsLiveCommentingProps {
    config: FastCommentsRNConfig
    styles?: IFastCommentsStyles
    callbacks?: FastCommentsCallbacks
    assets?: ImageAssetConfig
}

export function FastCommentsLiveCommenting({config, styles, callbacks, assets}: FastCommentsLiveCommentingProps) {
    if (!styles) {
        styles = getDefaultFastCommentsStyles();
    }
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}, assets); // shallow clone is important to prevent extra re-renders
    const state = useHookstate(serviceInitialState);
    const service = new FastCommentsLiveCommentingService(state, callbacks);
    const [isLoading, setLoading] = useState(true);
    const [isFetchingNextPage, setFetchingNextPage] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isReplyingToParent, setIsReplyingToParent] = useState(false);
    const isReplyingToParentRef = useRef(isReplyingToParent);
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

    const callbackObserver: CallbackObserver = {};
    const callbackObserverRef = useRef(callbackObserver);

    function handleReplyingTo(comment: RNComment | null) {
        // TODO confirm cancel here? would be a nice place to handle it as this is called for back button press and clicking cancel in UI.
        setIsReplyingToParent(!!comment);
        isReplyingToParentRef.current = !!comment;
        callbackObserverRef.current.replyingTo && callbackObserverRef.current.replyingTo(comment);
        callbacks && callbacks.replyingTo && callbacks.replyingTo(comment);
    }

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                if (isReplyingToParentRef.current) {
                    handleReplyingTo(null);
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove()
    }, []);

    if (state.blockingErrorMessage.get()) {
        return <View style={styles.root}><CommentAreaMessage styles={styles} message={state.blockingErrorMessage.get()}/></View>;
    } else if (!(state.commentsTree.length === 0 && state.config.readonly.get() && (state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()))) {
        const isInfiniteScroll = state.config.enableInfiniteScrolling.get();
        const paginationBeforeComments = isInfiniteScroll ? null : (state.commentsVisible.get() && state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles}/>
            : state.page.get() > 0 && !state.pagesLoaded.get().includes(state.page.get() - 1)
                ? <PaginationPrev state={state} styles={styles}/>
                : null);
        const paginationAfterComments = isInfiniteScroll ? null : (state.commentsVisible.get() && !state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles}/>
            : null);

        if (isLoading) {
            return <View style={[styles.root, styles.loadingOverlay]}><ActivityIndicator size="large"/></View>
        }

        const onEndReached = async () => {
            if (canPaginateNext(state)) {
                setFetchingNextPage(true);
                await paginateNext(state, service);
                setFetchingNextPage(false);
            }
        };

        const renderItem = (info: ListRenderItemInfo<State<RNComment>>) => <FastCommentsCommentView
            comment={info.item}
            state={state}
            styles={styles!}
            onVoteSuccess={callbacks?.onVoteSuccess}
            onReplySuccess={callbacks?.onReplySuccess}
            onAuthenticationChange={callbacks?.onAuthenticationChange}
            replyingTo={handleReplyingTo}
        />;

        return <View style={styles.root}>
            {
                state.hasBillingIssue.get() && state.isSiteAdmin.get() && <Text style={styles.red}>{state.translations.BILLING_INFO_INV.get()}</Text>
            }
            {
                state.isDemo.get() &&
                <Text style={styles.red}><RenderHtml source={{html: state.translations.DEMO_CREATE_ACCT.get()}} contentWidth={width}/></Text>
            }
            <LiveCommentingTopArea state={state} styles={styles}/>
            {paginationBeforeComments}
            {state.commentsVisible.get() &&
            <TRenderEngineProvider baseStyle={styles.comment?.text}>
                <RenderHTMLConfigProvider><FlatList
                    style={styles.commentsWrapper}
                    data={state.commentsTree}
                    keyExtractor={item => item._id.get()}
                    inverted={!state.config.newCommentsToBottom.get()}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    renderItem={renderItem}
                    ListFooterComponent={isFetchingNextPage
                        ? <ActivityIndicator size="small"/>
                        : null
                    }
                /></RenderHTMLConfigProvider>
            </TRenderEngineProvider>
            }
            {paginationAfterComments}
            <LiveCommentingBottomArea state={state} styles={styles} callbackObserver={callbackObserverRef.current}/>
        </View>;
    } else {
        return <View style={styles.root}><CommentAreaMessage styles={styles} message={'todo'}/></View>;
    }
}

