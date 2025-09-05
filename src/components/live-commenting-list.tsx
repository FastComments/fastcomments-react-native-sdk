import RenderHtml, {defaultHTMLElementModels, HTMLContentModel, RenderHTMLConfigProvider, TRenderEngineProvider} from "react-native-render-html";
import {ActivityIndicator, FlatList, ListRenderItemInfo, useWindowDimensions, View, Text} from "react-native";
import {State, useHookstate, useHookstateEffect} from "@hookstate/core";
import {FastCommentsCallbacks, FastCommentsState, IFastCommentsStyles, ImageAssetConfig, RNComment} from "../types";
import React, {MutableRefObject, useState} from 'react';
import {PaginationNext} from "./pagination-next";
import {PaginationPrev} from "./pagination-prev";
import {canPaginateNext, paginateNext, paginatePrev} from "../services/pagination";
import {CommentViewProps, FastCommentsCommentView} from "./comment";
import {arePropsEqual, incChangeCounter} from "../services/comment-render-determination";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
import {LiveCommentingTopArea} from "./live-commenting-top-area";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {CallbackObserver} from "./live-commenting-bottom-area";
import {iterateCommentsTreeWithDepth} from "../services/comment-trees";
import {CommentMenuState} from "./comment-menu";

export interface LiveCommentingListProps {
    callbacks?: FastCommentsCallbacks
    callbackObserver: CallbackObserver
    config: FastCommentsRNConfig
    imageAssets: ImageAssetConfig
    onReplySuccess: (comment: RNComment) => void
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState) => void
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean>
    styles: IFastCommentsStyles
    state: State<FastCommentsState>
    service: MutableRefObject<FastCommentsLiveCommentingService | undefined>
}

const CommentViewMemo = React.memo<CommentViewProps>(
    props => FastCommentsCommentView(props),
    (prevProps, nextProps) => arePropsEqual(prevProps, nextProps)
);

// makes reacts show inline
const customHTMLElementModels = {
    img: defaultHTMLElementModels.img.extend({
        contentModel: HTMLContentModel.mixed
    })
}

export function LiveCommentingList(props: LiveCommentingListProps) {
    const {
        callbacks,
        callbackObserver,
        config,
        imageAssets,
        onReplySuccess,
        openCommentMenu,
        requestSetReplyingTo,
        styles,
        service
    } = props;
    const state = useHookstate(props.state); // OPTIMIZATION creating local state
    const [isFetchingNextPage, setFetchingNextPage] = useState(false);
    const {width} = useWindowDimensions();

    const [viewableComments, setViewableComments] = useState<RNComment[]>([]);

    // It could be possible to switch to a flat list as the backing store, but not sure worth it yet as a tree is nice to work with.
    function createList() {
        const list: RNComment[] = [];
        const byId = state.commentsById.get({noproxy: true});
        const start = Date.now();
        // Re-creating the whole list generally takes 1-2ms.
        console.log('...Re-creating view list from tree...');
        iterateCommentsTreeWithDepth(state.commentsTree.get({noproxy: true, stealth: true}) as RNComment[], 0, (comment, depth) => {
            if (!comment) {
                return;
            }
            const parentId = comment.parentId ? comment.parentId : undefined;
            if (parentId) {
                const parent = byId[parentId];
                if (parent && !parent.hidden && !parent.repliesHidden) {
                    comment.depth = depth;
                    list.push(comment);
                }
            } else {
                comment.depth = depth;
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
    }, [state.commentsTree]);

    const setRepliesHidden = (parentComment: RNComment, repliesHidden: boolean) => {
        parentComment.repliesHidden = repliesHidden;
        incChangeCounter(parentComment);
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
    const renderItem = (info: ListRenderItemInfo<RNComment>) =>
        <CommentViewMemo
            comment={info.item}
            config={config}
            setRepliesHidden={setRepliesHidden}
            imageAssets={imageAssets}
            translations={state.translations.get({stealth: true})}
            state={state}
            styles={styles!}
            onAuthenticationChange={callbacks?.onAuthenticationChange}
            onReplySuccess={onReplySuccess}
            onVoteSuccess={callbacks?.onVoteSuccess}
            openCommentMenu={openCommentMenu}
            pickImage={callbacks?.pickImage}
            requestSetReplyingTo={requestSetReplyingTo}
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
            pickGIF={callbacks?.pickGIF}
            pickImage={callbacks?.pickImage}
            state={state}
            styles={styles}
            translations={state.translations.get()}
        />
        {paginationBeforeComments}
    </View>;

    console.log('!!!! ************** list re-rendered ************** !!!!')

    return <TRenderEngineProvider
        baseStyle={styles.comment?.text}
        classesStyles={styles.comment?.HTMLNodeStyleByClass}
        customHTMLElementModels={customHTMLElementModels}
    >
        <RenderHTMLConfigProvider>
            <FlatList
                style={styles.commentsWrapper}
                contentContainerStyle={styles.commentsListContent}
                data={viewableComments}
                keyExtractor={item => item && item._id !== undefined ? item._id : '???'}
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
            />
        </RenderHTMLConfigProvider>
    </TRenderEngineProvider>;
}
