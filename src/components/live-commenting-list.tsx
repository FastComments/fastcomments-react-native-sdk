import RenderHtml, {RenderHTMLConfigProvider, TRenderEngineProvider} from "react-native-render-html";
import {ActivityIndicator, FlatList, ListRenderItemInfo, useWindowDimensions, View, Text} from "react-native";
import {Downgraded, State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {FastCommentsCallbacks, FastCommentsState, IFastCommentsStyles, ImageAssetConfig, RNComment} from "../types";
import React, {MutableRefObject, useState} from 'react';
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {canPaginateNext, paginateNext, paginatePrev} from "../services/pagination";
import {CommentViewProps, FastCommentsCommentView} from "./comment";
import { arePropsEqual } from "../services/comment-render-determination";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
import {LiveCommentingTopArea} from "./live-commenting-top-area";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {CallbackObserver} from "./live-commenting-bottom-area";
import {iterateCommentsTreeState} from "../services/comment-trees";

export interface LiveCommentingListProps {
    callbacks?: FastCommentsCallbacks
    callbackObserver: CallbackObserver
    config: FastCommentsRNConfig
    handleReplyingTo: (comment: RNComment | null) => void
    imageAssets: ImageAssetConfig
    styles: IFastCommentsStyles
    state: State<FastCommentsState>
    service: MutableRefObject<FastCommentsLiveCommentingService | undefined>
}

const CommentViewMemo = React.memo<CommentViewProps>(
    props => FastCommentsCommentView(props),
    (prevProps, nextProps) => arePropsEqual(prevProps, nextProps)
);

export function LiveCommentingList(props: LiveCommentingListProps) {
    const {
        callbacks,
        callbackObserver,
        config,
        handleReplyingTo,
        imageAssets,
        styles,
        service
    } = props;
    const state = useHookstate(props.state); // OPTIMIZATION creating local state
    state.commentsById.attach(Downgraded);
    const [isFetchingNextPage, setFetchingNextPage] = useState(false);
    const {width} = useWindowDimensions();

    const [viewableComments, setViewableComments] = useState<State<RNComment>[]>([]);

    // It could be possible to switch to a flat list as the backing store, but not sure worth it yet as a tree is nice to work with.
    function createList() {
        const list: State<RNComment>[] = [];
        const byId = state.commentsById.get({noproxy: true});
        const start = Date.now();
        // Re-creating the whole list generally takes 1-2ms.
        console.log('...Re-creating view list from tree...');
        iterateCommentsTreeState(state.commentsTree, (comment) => {
            const parentId = comment.parentId ? comment.parentId.get() : undefined;
            if (parentId) {
                const parent = byId[parentId];
                if (parent && !parent.hidden && !parent.repliesHidden) {
                    list.push(comment);
                }
            } else {
                list.push(comment);
            }
        });
        console.log('...Re-created view list from tree with', list.length, 'comments.', Number(Date.now() - start).toLocaleString() + 'ms');
        setViewableComments(list);
    }

    // Re-recreating this list all the time and rendering the tree as a flat list is more efficient than trying to render a tree
    // due to state management/re-rendering of deep elements in the tree.
    useHookstateEffect(() => {
        createList()
    }, state.commentsTree);

    const setRepliesHidden = (parentComment: State<RNComment>, repliesHidden: boolean) => {
        parentComment.repliesHidden.set(repliesHidden);
        parentComment.changeCounter.set((changeCounter) => changeCounter ? changeCounter + 1 : 1); // sigh
        createList();
    }

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

    const onEndReached = async () => {
        if (state.config.enableInfiniteScrolling.get() && canPaginateNext(state)) {
            await doPaginateNext(false);
        }
    };

    // Note: we do not support changing image assets or translations without a complete reload, as a (reasonable) optimization.
    const renderItem = (info: ListRenderItemInfo<State<RNComment>>) =>
        <CommentViewMemo
            comment={info.item}
            config={config}
            setRepliesHidden={setRepliesHidden}
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
            callbackObserver={callbackObserver}
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

    console.log('!!!! ************** list re-rendered ************** !!!!')

    return <TRenderEngineProvider baseStyle={styles.comment?.text}>
        <RenderHTMLConfigProvider><FlatList
            style={styles.commentsWrapper}
            data={viewableComments}
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
    </TRenderEngineProvider>;
}
