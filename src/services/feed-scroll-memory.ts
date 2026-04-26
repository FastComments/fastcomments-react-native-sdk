/**
 * Module-level singleton remembering the last FlatList scroll offset for a
 * given (tenantId, urlId) feed. Mirrors the Android FastCommentsFeedView
 * saveScrollPosition / restoreScrollPosition pair, scoped to one process
 * lifetime. Two simultaneous instances with the same key would share the
 * slot; that's acceptable given how rarely a host app mounts the feed twice
 * with the same identifiers.
 */
const offsets: Map<string, number> = new Map();

export function feedScrollMemoryKey(tenantId: string | undefined, urlId: string | undefined): string {
    return (tenantId ?? '') + '|' + (urlId ?? '');
}

export function saveFeedScrollOffset(tenantId: string | undefined, urlId: string | undefined, offset: number): void {
    if (!Number.isFinite(offset) || offset < 0) return;
    offsets.set(feedScrollMemoryKey(tenantId, urlId), offset);
}

export function getFeedScrollOffset(tenantId: string | undefined, urlId: string | undefined): number | undefined {
    return offsets.get(feedScrollMemoryKey(tenantId, urlId));
}

export function clearFeedScrollOffset(tenantId: string | undefined, urlId: string | undefined): void {
    offsets.delete(feedScrollMemoryKey(tenantId, urlId));
}

export function clearAllFeedScrollOffsets(): void {
    offsets.clear();
}
