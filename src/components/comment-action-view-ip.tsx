import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { ModerationAPIComment } from 'fastcomments-sdk';
import { FastCommentsImageAsset, IFastCommentsStyles, RNComment } from '../types';
import { getActionTenantId } from '../services/tenants';
import { useStoreValue } from '../store/hooks';
import type { FastCommentsStore } from '../store/types';

export interface CommentActionViewByIPProps {
    close: (safe?: boolean) => void;
    comment: RNComment;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

const PAGE_SIZE = 20;

// Read-only text snippet from the moderation comment HTML (no rich rendering -
// this is a moderator overview list, not the comment thread).
function toSnippet(html: string): string {
    return html
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// The full web moderation view (filtered by this IP), opened in a browser - the
// same target the web widget's "View All From IP" redirects to.
function moderationDashboardUrl(store: FastCommentsStore, commentId: string): string {
    const { config } = store.getState();
    const apiHost = config.apiHost;
    // The dashboard needs a real host; the dev proxy ('/_fc') isn't navigable.
    const host =
        apiHost && /^https?:\/\//.test(apiHost)
            ? apiHost
            : config.region === 'eu'
            ? 'https://eu.fastcomments.com'
            : 'https://fastcomments.com';
    return `${host}/auth/my-account/moderate-comments?byIPFromComment=${encodeURIComponent(commentId)}&filter=&text-search=&page=1&count=50`;
}

export function CommentActionViewByIP({ comment, store, styles, close }: CommentActionViewByIPProps) {
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const modalStyles = styles.commentModerationModal;

    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [comments, setComments] = useState<ModerationAPIComment[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    // Guards state updates if the modal closes mid-fetch (consistent with the
    // ban/badge sub-modals).
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    // `NEXT` is "Load More <span>[count]</span>" - strip the markup/placeholder.
    const loadMoreText = translations.NEXT
        ? translations.NEXT.replace(/<[^>]+>/g, ' ').replace('[count]', '').replace(/\s+/g, ' ').trim()
        : '';

    // getApiComments is 1-indexed; a full page implies there may be more.
    const fetchPage = async (pageToLoad: number, append: boolean): Promise<void> => {
        const state = store.getState();
        const response = await state.sdk.moderationApi.getApiComments({
            tenantId: getActionTenantId({ store, tenantId: comment.tenantId }),
            byIPFromComment: comment._id,
            page: pageToLoad,
            count: PAGE_SIZE,
            sso: state.ssoConfigString,
        });
        const batch = response.comments ?? [];
        if (!mountedRef.current) return;
        setComments((prev) => (append ? [...prev, ...batch] : batch));
        setHasMore(batch.length >= PAGE_SIZE);
        setPage(pageToLoad);
    };

    useEffect(() => {
        (async () => {
            try {
                await fetchPage(1, false);
            } catch (e) {
                // Non-fatal: an empty list renders the "no comments" message.
            } finally {
                if (mountedRef.current) setLoading(false);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [comment._id, store]);

    const loadMore = async () => {
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            await fetchPage(page + 1, true);
        } catch (e) {
            // Leave the existing list; the button stays so the user can retry.
        } finally {
            if (mountedRef.current) setLoadingMore(false);
        }
    };

    return (
        <View style={modalStyles?.centeredView}>
            <View style={modalStyles?.modalView}>
                <TouchableOpacity style={modalStyles?.modalCancel} onPress={() => close(false)}>
                    <Image
                        source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                        style={{ width: 16, height: 16 }}
                    />
                </TouchableOpacity>
                {/* Header doubles as the link to the full web moderation view. */}
                <TouchableOpacity onPress={() => void Linking.openURL(moderationDashboardUrl(store, comment._id))}>
                    <Text style={modalStyles?.headerLink}>{translations.VIEW_ALL_FROM_IP} ↗</Text>
                </TouchableOpacity>
                {loading ? (
                    <View style={modalStyles?.loadingView}>
                        <ActivityIndicator />
                    </View>
                ) : comments.length === 0 ? (
                    <Text style={modalStyles?.emptyText}>{translations.NO_COMMENTS}</Text>
                ) : (
                    <ScrollView style={modalStyles?.scroll}>
                        {comments.map((c) => (
                            <View key={c.id} style={modalStyles?.listItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={modalStyles?.listItemTitle}>{c.commenterName}</Text>
                                    <Text style={modalStyles?.listItemSubtitle} numberOfLines={2}>
                                        {toSnippet(c.commentHTML)}
                                    </Text>
                                    {!!c.localDateString && <Text style={modalStyles?.listItemSubtitle}>{c.localDateString}</Text>}
                                </View>
                            </View>
                        ))}
                        {hasMore &&
                            (loadingMore ? (
                                <ActivityIndicator style={{ paddingVertical: 12 }} />
                            ) : (
                                <TouchableOpacity onPress={loadMore}>
                                    <Text style={modalStyles?.loadMore}>{loadMoreText}</Text>
                                </TouchableOpacity>
                            ))}
                    </ScrollView>
                )}
            </View>
        </View>
    );
}
