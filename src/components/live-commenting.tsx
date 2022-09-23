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
import {CommentViewProps, FastCommentsCommentView} from "./comment";
import {canPaginateNext, paginateNext, paginatePrev} from "../services/pagination";
import {arePropsEqual} from "../services/comment-render-determination";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";

export interface FastCommentsLiveCommentingProps {
    config: FastCommentsRNConfig
    styles?: IFastCommentsStyles
    callbacks?: FastCommentsCallbacks
    assets?: ImageAssetConfig
}

const CommentViewMemo = React.memo<CommentViewProps>(
    props => FastCommentsCommentView(props),
    (prevProps, nextProps) => arePropsEqual(prevProps, nextProps)
);

export function FastCommentsLiveCommenting({config, styles, callbacks, assets}: FastCommentsLiveCommentingProps) {
    if (!styles) {
        styles = getDefaultFastCommentsStyles();
    }
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}, assets); // shallow clone is important to prevent extra re-renders
    const imageAssets = serviceInitialState.imageAssets;
    const state = useHookstate(serviceInitialState);
    const service = useRef<FastCommentsLiveCommentingService>();
    useEffect(() => {
        service.current = new FastCommentsLiveCommentingService(state, callbacks);
    }, []);
    const [isLoading, setLoading] = useState(true);
    const [isFetchingNextPage, setFetchingNextPage] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isReplyingToParent, setIsReplyingToParent] = useState(false);
    const isReplyingToParentRef = useRef(isReplyingToParent);
    const {width} = useWindowDimensions();
    const loadAsync = async () => {
        if (service.current) {
            setLoading(true);
            await service.current.fetchRemoteState(false);
            setLoading(false);
            setIsLoaded(true);
            callbacks?.onCommentsRendered && callbacks?.onCommentsRendered(state.commentsTree.get());
        }
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
    } else if (!((state.commentsTree.length === 0 && state.config.readonly.get()) || ((state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()) && !state.commentsVisible.get()))) {
        const isInfiniteScroll = state.config.enableInfiniteScrolling.get();

        const doPaginateNext = async (isAll: boolean) => {
            setFetchingNextPage(true);
            await paginateNext(state, service.current!, isAll ? -1 : undefined);
            setFetchingNextPage(false);
        }

        const doPaginatePrev = async () => {
            setFetchingNextPage(true);
            await paginatePrev(state, service.current!);
            setFetchingNextPage(false);
        }

        const paginationBeforeComments = isInfiniteScroll ? null : (state.commentsVisible.get() && state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles} doPaginate={doPaginateNext}/>
            : <PaginationPrev state={state} styles={styles} doPaginate={doPaginatePrev}/>);
        const paginationAfterComments = isInfiniteScroll ? null : (state.commentsVisible.get() && !state.config.paginationBeforeComments.get()
            ? <PaginationNext state={state} styles={styles} doPaginate={doPaginateNext}/>
            : null);

        if (isLoading) {
            return <View style={[styles.root, styles.loadingOverlay]}><ActivityIndicator size="large"/></View>
        }

        const onEndReached = async () => {
            if (state.config.enableInfiniteScrolling.get() && canPaginateNext(state)) {
                await doPaginateNext(false);
            }
        };

        console.log('!!!! ************** root re-rendered ************** !!!!')

        // Note: we do not support changing image assets or translations without a complete reload, as a (reasonable) optimization.
        const renderItem = (info: ListRenderItemInfo<State<RNComment>>) =>
            <CommentViewMemo
                comment={info.item}
                config={config}
                imageAssets={imageAssets}
                translations={state.translations.get({stealth: true})}
                state={state}
                styles={styles!}
                onVoteSuccess={callbacks?.onVoteSuccess}
                onReplySuccess={callbacks?.onReplySuccess}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                pickImage={callbacks?.pickImage}
                replyingTo={handleReplyingTo}
                width={width}
            />;

        const header = <View>
            {
                state.hasBillingIssue.get() && state.isSiteAdmin.get() && <Text style={styles.red}>{state.translations.BILLING_INFO_INV.get()}</Text>
            }
            {
                state.isDemo.get() &&
                <Text style={styles.red}><RenderHtml source={{html: state.translations.DEMO_CREATE_ACCT.get()}} contentWidth={width}/></Text>
            }
            <LiveCommentingTopArea
                callbackObserver={callbackObserverRef.current}
                config={config}
                imageAssets={imageAssets}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                onNotificationSelected={callbacks?.onNotificationSelected}
                onReplySuccess={callbacks?.onReplySuccess}
                pickImage={callbacks?.pickImage}
                state={state}
                styles={styles}
                translations={state.translations.get()}
            />
            {paginationBeforeComments}
        </View>;

        return <View style={styles.root}>

            {state.commentsVisible.get() &&
            <TRenderEngineProvider baseStyle={styles.comment?.text}>
                <RenderHTMLConfigProvider><FlatList
                    style={styles.commentsWrapper}
                    data={state.commentsTree}
                    keyExtractor={item => item._id.get({stealth: true})}
                    inverted={state.config.newCommentsToBottom.get()}
                    maxToRenderPerBatch={state.PAGE_SIZE.get()}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    renderItem={renderItem}
                    ListHeaderComponent={header}
                    ListFooterComponent={
                        <View>
                            {
                                isFetchingNextPage
                                    ? <ActivityIndicator size="small"/>
                                    : paginationAfterComments
                            }
                        </View>
                    }
                /></RenderHTMLConfigProvider>
            </TRenderEngineProvider>
            }
            <LiveCommentingBottomArea
                callbackObserver={callbackObserverRef.current}
                imageAssets={imageAssets}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                onNotificationSelected={callbacks?.onNotificationSelected}
                onReplySuccess={callbacks?.onReplySuccess}
                pickImage={callbacks?.pickImage}
                state={state}
                styles={styles}
                translations={state.translations.get()}
            />
        </View>;
    } else if (!state.commentsVisible.get() && state.translations.get()) {
        return <View style={styles.root}>
            <ShowHideCommentsToggle state={state} styles={styles}/>
        </View>;
    } else {
        return <View style={styles.root}></View>;
    }
}

