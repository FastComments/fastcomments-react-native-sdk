import RenderHtml, {
    type CustomBlockRenderer,
    defaultHTMLElementModels,
    HTMLContentModel,
    HTMLElementModel,
    RenderHTMLConfigProvider,
    TRenderEngineProvider,
} from 'react-native-render-html';
import { ActivityIndicator, FlatList, Linking, ListRenderItemInfo, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, View, Text } from 'react-native';
import { FastCommentsCallbacks, IFastCommentsStyles, ImageAssetConfig, RNComment, ThreadLineSlot } from '../types';
import React, { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { PaginationNext } from './pagination-next';
import { PaginationPrev } from './pagination-prev';
import { canPaginateNext, paginateNext, paginatePrev } from '../services/pagination';
import { CommentViewProps, FastCommentsCommentView } from './comment';
import { FastCommentsLiveCommentingService, isLiveChatStyle } from '../services/fastcomments-live-commenting';
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
    openCommentMenu: (comment: RNComment, menuState: CommentMenuState, anchor?: { bottom: number; right: number }) => void;
    requestSetReplyingTo: (comment: RNComment | null) => Promise<boolean>;
    styles: IFastCommentsStyles;
    store: FastCommentsStore;
    service: MutableRefObject<FastCommentsLiveCommentingService | undefined>;
}

const CommentViewMemo = React.memo<CommentViewProps>((props) => FastCommentsCommentView(props));

const customHTMLElementModels = {
    // Inline emoticon/react images flow with the text...
    img: defaultHTMLElementModels.img.extend({
        contentModel: HTMLContentModel.mixed,
    }),
    // ...while uploaded comment images render block, like the web widget's
    // `.inline-image { display: block }` CSS. The server's <a class="inline-image">
    // wrapper is retagged to this element in domVisitors below.
    'comment-image-block': HTMLElementModel.fromCustomModel({
        tagName: 'comment-image-block',
        contentModel: HTMLContentModel.block,
    }),
};

const domVisitors = {
    onElement: (element: { tagName: string; attribs: Record<string, string> }) => {
        if (element.tagName === 'a' && typeof element.attribs.class === 'string' && element.attribs.class.includes('inline-image')) {
            element.tagName = 'comment-image-block';
        }
    },
};

// Keeps the web widget's tap-to-open behavior the anchor provided.
const CommentImageBlockRenderer: CustomBlockRenderer = function CommentImageBlockRenderer({ TDefaultRenderer, ...props }) {
    const href = props.tnode.attributes.href;
    return (
        <TDefaultRenderer
            {...props}
            onPress={href ? () => { void Linking.openURL(href); } : undefined}
        />
    );
};

const customRenderers = { 'comment-image-block': CommentImageBlockRenderer };

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
    const countAboveToggle = useStoreValue(store, (s) => s.config.countAboveToggle);
    const viewableComments = useMemo(() => {
        const out: RNComment[] = [];
        // Collapsed (useShowCommentsToggle): only the first countAboveToggle
        // ROOT comments render as a teaser, with their replies collapsed -
        // mirroring the web widget.
        if (!commentsVisible) {
            const teaserCount = countAboveToggle ?? 0;
            for (const entry of visibleEntries) {
                if (out.length >= teaserCount) break;
                const comment = byId[entry.id];
                if (!comment || comment.parentId) continue;
                out.push({ ...comment, depth: entry.depth, repliesHidden: true });
            }
            return out;
        }
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
        // Nesting rail: each child row gets one slot per indent level. A slot
        // draws a continuation line while that ancestor branch has more rows
        // below, and the rightmost slot hooks an elbow into this row's avatar.
        const lastVisibleChildOf: Record<string, string> = {};
        for (const c of out) {
            if (c.parentId) lastVisibleChildOf[c.parentId] = c._id;
        }
        for (const c of out) {
            const depth = c.depth ?? 0;
            if (!depth || !c.parentId) continue;
            const slots: ThreadLineSlot[] = new Array(depth);
            let node: RNComment | undefined = c;
            for (let level = depth - 1; level >= 0 && node && node.parentId; level--) {
                const isLast = lastVisibleChildOf[node.parentId] === node._id;
                slots[level] = level === depth - 1
                    ? (isLast ? 'elbow' : 'tee')
                    : (isLast ? 'none' : 'line');
                node = byId[node.parentId];
            }
            c.threadLines = slots;
        }
        return out;
    }, [visibleEntries, byId, commentsVisible, countAboveToggle]);

    const setRepliesHidden = (parentComment: RNComment, repliesHidden: boolean) => {
        store.getState().setRepliesHidden(parentComment._id, repliesHidden);
        // Replies on a collapsed (countAboveToggle) teaser are not rendered at
        // all; like the web widget, toggling them expands the whole list.
        if (!commentsVisible) store.getState().setCommentsVisible(true);
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

    // Chat mode: chronological list, newest at the bottom. Older history loads
    // from the TOP edge, auto-scroll keeps the newest message in view like the
    // Android LiveChatView (pause while scrolled up, resume at the bottom).
    const chatStyle = isLiveChatStyle(config);
    const listRef = useRef<FlatList<RNComment>>(null);
    const isNearBottomRef = useRef(true);
    const initialScrollDoneRef = useRef(false);
    const lastCommentIdRef = useRef<string | undefined>(undefined);
    const currentUserId = useStoreValue(store, (s) => {
        const user = s.currentUser;
        return user && 'id' in user ? user.id : undefined;
    });
    const lastComment = chatStyle && viewableComments.length > 0
        ? viewableComments[viewableComments.length - 1]
        : undefined;
    useEffect(() => {
        if (!chatStyle || !lastComment) return;
        const previousId = lastCommentIdRef.current;
        lastCommentIdRef.current = lastComment._id;
        if (previousId === lastComment._id) return;
        // Initial load also lands here, scrolling the chat to the newest message.
        if (isNearBottomRef.current || (currentUserId !== undefined && lastComment.userId === currentUserId)) {
            listRef.current?.scrollToEnd({ animated: true });
        }
    }, [chatStyle, lastComment?._id, currentUserId]);

    // The mount effect can fire before web layout settles, leaving the chat
    // parked at the oldest message; pin to the bottom once content has size.
    const onContentSizeChange = () => {
        if (!chatStyle) return;
        if (!initialScrollDoneRef.current && viewableComments.length > 0) {
            initialScrollDoneRef.current = true;
            listRef.current?.scrollToEnd({ animated: false });
        }
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (!chatStyle) return;
        const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
        const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
        isNearBottomRef.current = distanceFromBottom < 80;
        if (contentOffset.y < 40 && !isFetchingNextPage && canPaginateNext(store)) {
            // Known v1 limitation: prepending can shift the scroll position on
            // RN versions without maintainVisibleContentPosition on Android.
            doPaginateNext(false);
        }
    };

    const onEndReached = async () => {
        // In chat mode the bottom edge is the newest message; older history
        // loads from the top via onScroll instead.
        if (commentsVisible && !chatStyle && enableInfiniteScrolling && canPaginateNext(store)) {
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
            tagsStyles={styles.comment?.textLinkStyles}
            classesStyles={styles.comment?.HTMLNodeStyleByClass}
            customHTMLElementModels={customHTMLElementModels}
            domVisitors={domVisitors}
        >
            <RenderHTMLConfigProvider renderers={customRenderers}>
                <FlatList
                    ref={listRef}
                    testID="recyclerViewComments"
                    accessibilityLabel="recyclerViewComments"
                    style={styles.commentsWrapper}
                    contentContainerStyle={styles.commentsListContent}
                    data={viewableComments}
                    keyExtractor={(item, index) => (item && item._id !== undefined ? item._id : `missing-${index}`)}
                    maxToRenderPerBatch={PAGE_SIZE}
                    onScroll={chatStyle ? onScroll : undefined}
                    onContentSizeChange={chatStyle ? onContentSizeChange : undefined}
                    scrollEventThrottle={chatStyle ? 64 : undefined}
                    onEndReachedThreshold={0.3}
                    onEndReached={onEndReached}
                    renderItem={renderItem}
                    ListHeaderComponent={header}
                    ListEmptyComponent={
                        // A collapsed toggle state is intentionally empty, not "no comments".
                        commentsVisible ? (
                            <View
                                testID="emptyStateView"
                                accessibilityLabel="emptyStateView"
                                style={styles.comment?.emptyState}
                            >
                                <Text style={styles.comment?.emptyStateText}>
                                    {translations.NO_COMMENTS || 'No comments yet'}
                                </Text>
                            </View>
                        ) : null
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
