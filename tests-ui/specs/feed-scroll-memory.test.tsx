/**
 * Verifies the FastCommentsFeed remembers its FlatList scroll offset across an
 * unmount/remount when the (tenantId, urlId) key matches. Mirrors the
 * Android FastCommentsFeedView.saveScrollPosition / restoreScrollPosition
 * pair.
 */
import React from 'react';
import { FlatList } from 'react-native';
import { render, fireEvent, act } from '@testing-library/react-native';
import { FastCommentsFeed } from '../../src/components/feed';
import {
    clearAllFeedScrollOffsets,
    getFeedScrollOffset,
} from '../../src/services/feed-scroll-memory';
import { pollUntil, sleep } from '../framework/harness/poll';
import type { FastCommentsRNConfig } from '../../src/types/react-native-config';

interface ScrollEventNativeShape {
    contentOffset: { x: number; y: number };
    contentSize: { width: number; height: number };
    layoutMeasurement: { width: number; height: number };
}

function buildScrollNativeEvent(offsetY: number): ScrollEventNativeShape {
    return {
        contentOffset: { x: 0, y: offsetY },
        contentSize: { width: 320, height: 4000 },
        layoutMeasurement: { width: 320, height: 600 },
    };
}

function buildStubConfig(tenantId: string, urlId: string): FastCommentsRNConfig {
    // Unreachable host so the SDK's mount-time fetch fails fast and the feed
    // proceeds to render with an empty list. We don't need a real backend for
    // scroll-offset preservation.
    const cfg: Partial<FastCommentsRNConfig> & { apiHost?: string; wsHost?: string } = {
        tenantId,
        urlId,
        apiHost: 'http://127.0.0.1:1',
        wsHost: 'ws://127.0.0.1:1',
        disableLiveCommenting: true,
    };
    return cfg as FastCommentsRNConfig;
}

describe('FastCommentsFeed scroll memory', () => {
    const tenantId = 'scroll-mem-tenant';
    const urlId = 'scroll-mem-url';

    beforeEach(() => {
        clearAllFeedScrollOffsets();
    });

    afterAll(() => {
        clearAllFeedScrollOffsets();
    });

    it('saves scroll offset on unmount and restores it on remount with the same (tenantId, urlId)', async () => {
        const config = buildStubConfig(tenantId, urlId);

        const first = render(<FastCommentsFeed config={config} />);
        await pollUntil(() => !!first.queryByTestId('recyclerViewFeed'), {
            timeoutMs: 15000,
            label: 'first mount: recyclerViewFeed visible',
        });

        const list = first.getByTestId('recyclerViewFeed');
        act(() => {
            fireEvent.scroll(list, { nativeEvent: buildScrollNativeEvent(200) });
        });

        first.unmount();

        // After unmount, the offset is persisted in the module-level map.
        expect(getFeedScrollOffset(tenantId, urlId)).toBe(200);

        // Spy on FlatList's scrollToOffset BEFORE remount so we can capture
        // the restore call.
        const scrollToOffsetSpy = jest
            .spyOn(FlatList.prototype, 'scrollToOffset')
            .mockImplementation(() => {});

        try {
            const second = render(<FastCommentsFeed config={config} />);
            await pollUntil(() => !!second.queryByTestId('recyclerViewFeed'), {
                timeoutMs: 15000,
                label: 'second mount: recyclerViewFeed visible',
            });

            // The restore is scheduled via setTimeout(0) after data load, so
            // poll briefly until the spy receives the saved offset.
            await pollUntil(
                () =>
                    scrollToOffsetSpy.mock.calls.some(
                        (args) => args[0] && args[0].offset === 200 && args[0].animated === false
                    ),
                { timeoutMs: 5000, label: 'scrollToOffset called with offset 200' }
            );

            second.unmount();
        } finally {
            scrollToOffsetSpy.mockRestore();
        }
    });

    it('does not save when preserveFeedScrollPosition is false', async () => {
        const config: FastCommentsRNConfig = {
            ...buildStubConfig(tenantId, urlId + '-disabled'),
            preserveFeedScrollPosition: false,
        };

        const r = render(<FastCommentsFeed config={config} />);
        await pollUntil(() => !!r.queryByTestId('recyclerViewFeed'), {
            timeoutMs: 15000,
            label: 'recyclerViewFeed visible (disabled)',
        });

        const list = r.getByTestId('recyclerViewFeed');
        act(() => {
            fireEvent.scroll(list, { nativeEvent: buildScrollNativeEvent(150) });
        });
        // Give onScroll a tick.
        await sleep(10);

        r.unmount();

        expect(getFeedScrollOffset(tenantId, urlId + '-disabled')).toBeUndefined();
    });

    it('does not restore for a different (tenantId, urlId) pair', async () => {
        const cfgA = buildStubConfig(tenantId, urlId + '-a');
        const cfgB = buildStubConfig(tenantId, urlId + '-b');

        const a = render(<FastCommentsFeed config={cfgA} />);
        await pollUntil(() => !!a.queryByTestId('recyclerViewFeed'), {
            timeoutMs: 15000,
            label: 'A: recyclerViewFeed visible',
        });
        act(() => {
            fireEvent.scroll(a.getByTestId('recyclerViewFeed'), {
                nativeEvent: buildScrollNativeEvent(321),
            });
        });
        a.unmount();

        expect(getFeedScrollOffset(tenantId, urlId + '-a')).toBe(321);
        expect(getFeedScrollOffset(tenantId, urlId + '-b')).toBeUndefined();

        const scrollToOffsetSpy = jest
            .spyOn(FlatList.prototype, 'scrollToOffset')
            .mockImplementation(() => {});

        try {
            const b = render(<FastCommentsFeed config={cfgB} />);
            await pollUntil(() => !!b.queryByTestId('recyclerViewFeed'), {
                timeoutMs: 15000,
                label: 'B: recyclerViewFeed visible',
            });
            // Wait long enough for any errant restore to fire.
            await sleep(50);
            const restoredWith321 = scrollToOffsetSpy.mock.calls.some(
                (args) => args[0] && args[0].offset === 321
            );
            expect(restoredWith321).toBe(false);
            b.unmount();
        } finally {
            scrollToOffsetSpy.mockRestore();
        }
    });
});
