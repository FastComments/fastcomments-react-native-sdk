/**
 * Feed post shapes used by the React Native SDK Feed feature. Mirrors the
 * `FeedPost` / `CreateFeedPostParams` from the OpenAPI client (kept narrow
 * because the RN MVP only consumes a subset of fields).
 */

export interface FeedPost {
    id: string;
    tenantId: string;
    title?: string;
    fromUserId?: string;
    fromUserDisplayName?: string | null;
    fromUserAvatar?: string | null;
    tags?: string[];
    contentHTML?: string;
    createdAt: string | number | Date;
    reacts?: Record<string, number>;
    /**
     * Per-user reaction map: present (true) when the current user has reacted
     * with that reactType. Hydrated client-side via the optimistic reaction
     * flow and live `fr`/`dfr` events. Not on the wire shape from the feed
     * list endpoint - that's tracked on a separate `user-reacts` call which
     * the MVP doesn't make yet, so this is empty until the user reacts in-app.
     */
    myReacts?: Record<string, boolean>;
    commentCount?: number | null;
}

export interface CreateFeedPostParams {
    title?: string;
    contentHTML?: string;
    fromUserId?: string;
    fromUserDisplayName?: string;
    tags?: string[];
    meta?: Record<string, string>;
}
