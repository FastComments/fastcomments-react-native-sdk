import RenderHtml, {
    defaultHTMLElementModels,
    HTMLContentModel,
    RenderHTMLConfigProvider,
    TRenderEngineProvider,
} from 'react-native-render-html';
import { ActivityIndicator, FlatList, ListRenderItemInfo, useWindowDimensions, View, Text } from 'react-native';
import { FastCommentsCallbacks, IFastCommentsStyles, ImageAssetConfig, RNComment } from '../types';
import React, { MutableRefObject, useMemo, useState } from 'react';
import { PaginationNext } from './pagination-next';
import { PaginationPrev } from './pagination-prev';
import { canPaginateNext, paginateNext, paginatePrev } from '../services/pagination';
import { CommentViewProps, FastCommentsCommentView } from './comment';
import { FastCommentsLiveCommentingService } from '../services/fastcomments-live-commenting';
import { LiveCommentingTopArea } from './live-commenting-top-area';
import { FastCommentsRNConfig } from '../types/react-native-config';
import { CallbackObserver } from './live-commenting-bottom-area';
import { CommentMenuState } from './comment-menu';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { computeVisibleList } from '../store/selectors/visible-list';

export interface LiveCommentingListProps {
    callbacks?: FastCommentsCallbacks;
    callbackObserver: CallbackObserver;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    onReplySuccess: (comment: RNComment) => void;
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState) => void;
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean>;
    styles: IFastCommentsStyles;
    store: FastCommentsStore;
    service: MutableRefObject<FastCommentsLiveCommentingService | undefined>;
}

const CommentViewMemo = React.memo<CommentViewProps>((props) => FastCommentsCommentView(props));

const customHTMLElementModels = {
    img: defaultHTMLElementModels.img.extend({
        contentModel: HTMLContentModel.mixed,
    }),
};

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
        service,
        store,
    } = props;

    const [isFetchingNextPage, setFetchingNextPage] = useState(false);
    const { width } = useWindowDimensions();

    // Subscribe to the slices that determine the flat list. Recompute only when any of them change.
    const byId = useStoreValue(store, (s) => s.byId);
    const childrenByParent = useStoreValue(store, (s) => s.childrenByParent);
    const rootOrder = useStoreValue(store, (s) => s.rootOrder);
    const commentsVisible = useStoreValue(store, (s) => s.commentsVisible);
    const paginationBeforeCommentsFlag = useStoreValue(store, (s) => !!s.config.paginationBeforeComments);
    const enableInfiniteScrolling = useStoreValue(store, (s) => !!s.config.enableInfiniteScrolling);
    const hasBillingIssue = useStoreValue(store, (s) => s.hasBillingIssue);
    const isSiteAdmin = useStoreValue(store, (s) => s.isSiteAdmin);
    const isDemo = useStoreValue(store, (s) => s.isDemo);
    const translations = useStoreValue(store, (s) => s.translations);
    const PAGE_SIZE = useStoreValue(store, (s) => s.PAGE_SIZE);

    const visibleEntries = useMemo(
        () => computeVisibleList({ byId, childrenByParent, rootOrder } as any),
        [byId, childrenByParent, rootOrder]
    );
    const viewableComments = useMemo(() => {
        const out: RNComment[] = [];
        for (const entry of visibleEntries) {
            const comment = byId[entry.id];
            if (!comment) continue;
            // Skip comments whose visible parent is hidden or repliesHidden.
            if (comment.parentId) {
                const parent = byId[comment.parentId];
                if (!parent || parent.hidden || parent.repliesHidden) continue;
            }
            // Attach a depth for indentation without mutating the canonical object.
            out.push({ ...comment, depth: entry.depth });
        }
        return out;
    }, [visibleEntries, byId]);

    const setRepliesHidden = (parentComment: RNComment, repliesHidden: boolean) => {
        store.getState().setRepliesHidden(parentComment._id, repliesHidden);
    };

    const doPaginateNext = async (isAll: boolean) => {
        setFetchingNextPage(true);
        await paginateNext(store, service.current!, isAll ? -1 : undefined);
        setFetchingNextPage(false);
    };

    const doPaginatePrev = async () => {
        setFetchingNextPage(true);
        await paginatePrev(store, service.current!);
        setFetchingNextPage(false);
    };

    const paginationBeforeComments = enableInfiniteScrolling
        ? null
        : commentsVisible && paginationBeforeCommentsFlag
        ? <PaginationNext store={store} styles={styles} doPaginate={doPaginateNext} />
        : <PaginationPrev store={store} styles={styles} doPaginate={doPaginatePrev} />;
    const paginationAfterComments =
        enableInfiniteScrolling || !commentsVisible || paginationBeforeCommentsFlag
            ? null
            : <PaginationNext store={store} styles={styles} doPaginate={doPaginateNext} />;

    const onEndReached = async () => {
        if (enableInfiniteScrolling && canPaginateNext(store)) {
            await doPaginateNext(false);
        }
    };

    const renderItem = (info: ListRenderItemInfo<RNComment>) => (
        <CommentViewMemo
            comment={info.item}
            config={config}
            setRepliesHidden={setRepliesHidden}
            imageAssets={imageAssets}
            translations={translations}
            store={store}
            styles={styles!}
            onAuthenticationChange={callbacks?.onAuthenticationChange}
            onReplySuccess={onReplySuccess}
            onVoteSuccess={callbacks?.onVoteSuccess}
            openCommentMenu={openCommentMenu}
            pickImage={callbacks?.pickImage}
            requestSetReplyingTo={requestSetReplyingTo}
            width={width}
        />
    );

    const demoHtml = useMemo(
        () => (translations.DEMO_CREATE_ACCT ? { html: translations.DEMO_CREATE_ACCT } : { html: '' }),
        [translations.DEMO_CREATE_ACCT]
    );

    const header = (
        <View>
            {hasBillingIssue && isSiteAdmin && (
                <Text style={styles.red}>{translations.BILLING_INFO_INV}</Text>
            )}
            {isDemo && (
                <Text style={styles.red}>
                    <RenderHtml source={demoHtml} contentWidth={width} />
                </Text>
            )}
            <LiveCommentingTopArea
                callbackObserver={callbackObserver}
                config={config}
                imageAssets={imageAssets}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                onNotificationSelected={callbacks?.onNotificationSelected}
                onReplySuccess={callbacks?.onReplySuccess}
                pickGIF={callbacks?.pickGIF}
                pickImage={callbacks?.pickImage}
                store={store}
                styles={styles}
                translations={translations}
            />
            {paginationBeforeComments}
        </View>
    );

    return (
        <TRenderEngineProvider
            baseStyle={styles.comment?.text}
            classesStyles={styles.comment?.HTMLNodeStyleByClass}
            customHTMLElementModels={customHTMLElementModels}
        >
            <RenderHTMLConfigProvider>
                <FlatList
                    testID="recyclerViewComments"
                    accessibilityLabel="recyclerViewComments"
                    style={styles.commentsWrapper}
                    contentContainerStyle={styles.commentsListContent}
                    data={viewableComments}
                    keyExtractor={(item, index) => (item && item._id !== undefined ? item._id : `missing-${index}`)}
                    maxToRenderPerBatch={PAGE_SIZE}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    renderItem={renderItem}
                    ListHeaderComponent={header}
                    ListEmptyComponent={
                        <View
                            testID="emptyStateView"
                            accessibilityLabel="emptyStateView"
                            style={styles.comment?.emptyState}
                        >
                            <Text style={styles.comment?.emptyStateText}>
                                {translations.NO_COMMENTS || 'No comments yet'}
                            </Text>
                        </View>
                    }
                    ListFooterComponent={
                        <View>
                            {isFetchingNextPage ? <ActivityIndicator size="small" /> : paginationAfterComments}
                        </View>
                    }
                />
            </RenderHTMLConfigProvider>
        </TRenderEngineProvider>
    );
}
