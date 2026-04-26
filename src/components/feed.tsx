import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ListRenderItemInfo,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Text,
    View,
} from 'react-native';
import { FastCommentsLiveCommentingService } from '../services/fastcomments-live-commenting';
import { getDefaultFastCommentsStyles } from '../resources';
import { addTranslationsToStore } from '../services/translations';
import { createFeedPost, loadFeedPosts } from '../services/feed';
import { teardownFeedLive } from '../services/feed-live';
import {
    getFeedScrollOffset,
    saveFeedScrollOffset,
} from '../services/feed-scroll-memory';
import { startFeedStatsPoll, stopFeedStatsPoll } from '../services/feed-stats';
import { makeRequest } from '../services/http';
import { FeedNewPostsBanner } from './feed-new-posts-banner';
import { FeedPostComposer } from './feed-post-composer';
import { FeedPostRow } from './feed-post-row';
import type { FastCommentsRNConfig } from '../types/react-native-config';
import type { CreateFeedPostParams, FeedPost } from '../types/feed-post';
import type { FeedCustomToolbarButton } from '../types/feed-custom-toolbar-button';
import type {
    GetTranslationsResponse,
    IFastCommentsStyles,
    ImageAssetConfig,
} from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface FastCommentsFeedProps {
    config: FastCommentsRNConfig;
    styles?: IFastCommentsStyles;
    assets?: ImageAssetConfig;
    customToolbarButtons?: FeedCustomToolbarButton[];
    /**
     * Override the default 30s stats-poll cadence. Primarily for tests so the
     * polling loop ticks within a reasonable jest timeout. When omitted the
     * service falls back to its built-in default.
     */
    statsPollIntervalMs?: number;
    /**
     * Test hook: invoked once on mount with the per-instance store so tests
     * can inspect feed state (e.g. assert that polled stats merged into
     * `feedPostsById`). Not part of the public API.
     */
    onStoreReady?: (store: FastCommentsStore) => void;
}

export function FastCommentsFeed({ config, styles, assets, customToolbarButtons, statsPollIntervalMs, onStoreReady }: FastCommentsFeedProps) {
    const effectiveStyles = styles ?? getDefaultFastCommentsStyles();

    const storeRef = useRef<FastCommentsStore | null>(null);
    if (storeRef.current === null) {
        storeRef.current = FastCommentsLiveCommentingService.createStoreFromConfig({ ...config }, assets);
    }
    const store = storeRef.current!;

    const translations = useStoreValue(store, (s) => s.translations);
    const feedPostOrder = useStoreValue(store, (s) => s.feedPostOrder);
    const feedPostsById = useStoreValue(store, (s) => s.feedPostsById);
    const feedNewPostsCount = useStoreValue(store, (s) => s.feedNewPostsCount);
    const feedHasMore = useStoreValue(store, (s) => s.feedHasMore);
    const feedAfterId = useStoreValue(store, (s) => s.feedAfterId);
    const feedLoadFailed = useStoreValue(store, (s) => s.feedLoadFailed);
    const wsConnected = useStoreValue(store, (s) => s.wsConnected);
    const currentUser = useStoreValue(store, (s) => s.currentUser);
    const PAGE_SIZE = useStoreValue(store, (s) => s.PAGE_SIZE);

    const [isLoading, setIsLoading] = useState(true);
    const [isPaging, setIsPaging] = useState(false);
    const listRef = useRef<FlatList<FeedPost>>(null);
    const lastScrollOffsetRef = useRef<number>(0);
    const preserveScroll = config.preserveFeedScrollPosition !== false;
    const scrollKeyRef = useRef<{ tenantId: string | undefined; urlId: string | undefined }>({
        tenantId: config.tenantId,
        urlId: config.urlId,
    });

    useEffect(() => {
        let cancelled = false;
        async function init() {
            setIsLoading(true);
            // Translations: pull the comment-ui set once on mount. The Feed
            // is rendered standalone so it doesn't piggyback on the comments
            // GET. We don't fail the feed load if this errors - the feed
            // simply renders with empty translation strings.
            try {
                let url = '/translations/widgets/comment-ui?useFullTranslationIds=true';
                if (config.locale) url += '&locale=' + encodeURIComponent(config.locale);
                const response = await makeRequest<GetTranslationsResponse<string>>({
                    apiHost: store.getState().apiHost,
                    method: 'GET',
                    url,
                });
                if (!cancelled && response.translations) {
                    addTranslationsToStore(store, response.translations);
                }
            } catch (e) {
                // Non-fatal.
            }

            await loadFeedPosts(store);
            if (!cancelled) {
                setIsLoading(false);
                // Restore the saved scroll offset for this (tenantId, urlId)
                // after the data has populated. We schedule via setTimeout so
                // the FlatList has rendered the rows before we ask it to
                // scroll - on RN, scrollToOffset before layout is a no-op.
                if (preserveScroll) {
                    const saved = getFeedScrollOffset(scrollKeyRef.current.tenantId, scrollKeyRef.current.urlId);
                    if (saved !== undefined && saved > 0) {
                        const target = saved;
                        lastScrollOffsetRef.current = target;
                        setTimeout(() => {
                            if (cancelled) return;
                            const list = listRef.current;
                            if (!list) return;
                            try {
                                list.scrollToOffset({ offset: target, animated: false });
                            } catch (e) {
                                // ignore - jest's FlatList mock may not implement scrollToOffset.
                            }
                        }, 0);
                    }
                }
            }
        }
        void init();
        return () => {
            cancelled = true;
            if (preserveScroll) {
                saveFeedScrollOffset(
                    scrollKeyRef.current.tenantId,
                    scrollKeyRef.current.urlId,
                    lastScrollOffsetRef.current
                );
            }
            teardownFeedLive(store);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stats polling lifecycle. Run only while the WS is connected; flipping
    // back to disconnected stops the timer, and a reconnect re-arms it.
    useEffect(() => {
        if (wsConnected) {
            startFeedStatsPoll(store, statsPollIntervalMs);
        } else {
            stopFeedStatsPoll(store);
        }
        return () => {
            stopFeedStatsPoll(store);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsConnected, statsPollIntervalMs]);

    // Test-only hook: surface the per-instance store. Stable across renders.
    useEffect(() => {
        if (onStoreReady) onStoreReady(store);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const data: FeedPost[] = useMemo(
        () =>
            feedPostOrder
                .map((id) => feedPostsById[id])
                .filter((p): p is FeedPost => !!p),
        [feedPostOrder, feedPostsById]
    );

    const onBannerPress = () => {
        const s = store.getState();
        s.clearFeedNewPostsCount();
        // Reload the head; this replaces the list with the freshest posts.
        void loadFeedPosts(store).then(() => {
            if (listRef.current && data.length > 0) {
                try {
                    listRef.current.scrollToOffset({ offset: 0, animated: true });
                } catch (e) {
                    // ignore - jest's FlatList mock may not implement scrollToOffset.
                }
            }
        });
    };

    const onSubmit = async (params: CreateFeedPostParams) => {
        await createFeedPost(store, params);
    };

    const onEndReached = async () => {
        if (isPaging || !feedHasMore || !feedAfterId) return;
        setIsPaging(true);
        try {
            await loadFeedPosts(store, { afterId: feedAfterId });
        } finally {
            setIsPaging(false);
        }
    };

    const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e?.nativeEvent?.contentOffset?.y;
        if (typeof y === 'number' && Number.isFinite(y) && y >= 0) {
            lastScrollOffsetRef.current = y;
        }
    };

    const renderItem = (info: ListRenderItemInfo<FeedPost>) => (
        <FeedPostRow
            post={info.item}
            translations={translations}
            styles={effectiveStyles}
            customToolbarButtons={customToolbarButtons}
            store={store}
            currentUser={currentUser}
        />
    );

    const empty = (
        <View
            testID="emptyStateView"
            accessibilityLabel="emptyStateView"
            style={effectiveStyles.feed?.emptyState}
        >
            <Text style={effectiveStyles.feed?.emptyStateText}>{translations.FEED_EMPTY}</Text>
        </View>
    );

    if (isLoading) {
        return (
            <View style={[effectiveStyles.root, effectiveStyles.loadingOverlay]}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={effectiveStyles.feed?.root}>
            <FeedNewPostsBanner
                count={feedNewPostsCount}
                translations={translations}
                styles={effectiveStyles}
                onPress={onBannerPress}
            />
            {feedLoadFailed && (
                <View style={effectiveStyles.feed?.loadFailed}>
                    <Text style={effectiveStyles.feed?.loadFailedText}>
                        {translations.FEED_LOAD_FAILED}
                    </Text>
                </View>
            )}
            <FlatList
                ref={listRef}
                testID="recyclerViewFeed"
                accessibilityLabel="recyclerViewFeed"
                data={data}
                keyExtractor={(item, index) => (item && item.id !== undefined ? item.id : `missing-${index}`)}
                renderItem={renderItem}
                ListEmptyComponent={empty}
                contentContainerStyle={effectiveStyles.feed?.listContent}
                maxToRenderPerBatch={PAGE_SIZE}
                onEndReachedThreshold={0.3}
                onEndReached={onEndReached}
                onScroll={onScroll}
                scrollEventThrottle={16}
                ListFooterComponent={isPaging ? <ActivityIndicator size="small" /> : null}
            />
            <FeedPostComposer
                translations={translations}
                styles={effectiveStyles}
                submit={onSubmit}
            />
        </View>
    );
}
