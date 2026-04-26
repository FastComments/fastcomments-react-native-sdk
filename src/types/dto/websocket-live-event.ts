import {FastCommentsBadge, FastCommentsCommentWidgetConfig, FastCommentsWidgetComment } from "fastcomments-typescript";
import {UserNotification} from "../user-notification";
import {FeedPost} from "../feed-post";

export interface FastCommentsUserBadge extends FastCommentsBadge {
    userId?: string;
}

export interface WebsocketLiveNewBadgeEvent {
    broadcastId: string;
    type: 'new-badge';
    badge: FastCommentsUserBadge;
}

export interface WebsocketLiveRemovedBadgeEvent {
    broadcastId: string;
    type: 'removed-badge';
    badge: FastCommentsUserBadge;
}

export interface WebsocketLiveNotificationEvent {
    broadcastId: string;
    type: 'notification';
    notification: UserNotification;
}

export interface WebsocketLivePresenceUpdate {
    bId: string; // shortened to save bandwidth because these are frequent
    /** Wire format is 'p-u' (shortened from 'presence-update' to save bandwidth). **/
    type: 'p-u';
    /** User ids joined. **/
    uj?: string[];
    /** User ids left. **/
    ul?: string[];
    /** Total connected subscriber count for this thread. **/
    sc?: number;
}

export interface WebsocketLiveVote {
    commentId: string;
    direction: 1 | -1;
    userId?: string;
}

export interface WebsocketLiveNewVoteEvent {
    broadcastId: string;
    type: 'new-vote';
    timestamp: number;
    vote: WebsocketLiveVote;
}

export interface WebsocketLiveDeletedVoteEvent {
    broadcastId: string;
    type: 'deleted-vote';
    timestamp: number;
    vote: WebsocketLiveVote;
}

export interface WebsocketLiveDeletedCommentEvent {
    broadcastId: string;
    type: 'deleted-comment';
    timestamp: number;
    comment: FastCommentsWidgetComment;
}

export interface FastCommentsCommentPosition {
    /** id comment is before **/
    before: string | null;
    /** id comment is after **/
    after: string | null;
}

export type FastCommentsCommentPositions = Record<'OF' | 'NF' | 'MR', FastCommentsCommentPosition>;

export interface WebsocketLiveNewOrUpdatedCommentEvent {
    broadcastId: string;
    type: 'new-comment' | 'updated-comment';
    timestamp: number;
    comment: FastCommentsWidgetComment;
    extraInfo?: {
        commentPositions: FastCommentsCommentPositions
    }
}

export interface WebsocketLiveNewConfigEvent {
    broadcastId: string;
    type: 'new-config';
    config: FastCommentsCommentWidgetConfig;
}

/**
 * Wire-format feed post: backend sends MongoDB-style `_id`. Both `id` and
 * `_id` are tolerated since we normalize at the consumer.
 */
export interface WireFeedPostEvent extends Omit<FeedPost, 'id'> {
    _id?: string;
    id?: string;
}

export interface WebsocketLiveNewFeedPostEvent {
    broadcastId: string;
    type: 'new-feed-post';
    timestamp: number;
    feedPost: WireFeedPostEvent;
}

export interface WebsocketLiveUpdatedFeedPostEvent {
    broadcastId: string;
    type: 'updated-feed-post';
    timestamp: number;
    feedPost: WireFeedPostEvent;
}

export interface WebsocketLiveDeletedFeedPostEvent {
    broadcastId: string;
    type: 'deleted-feed-post';
    timestamp: number;
    /** Server emits `postId`, not a full feedPost. */
    postId: string;
}

/**
 * Server-side payload pushed by `publishFeedPostReactionUpdate` for a feed
 * reaction (add or undo). The wire `type` discriminator is `'fr'` for new
 * and `'dfr'` for deleted, matching `LiveEventType.NewFeedPostReact` and
 * `LiveEventType.DeletedFeedPostReact` from the core.
 */
export interface WebsocketLiveFeedPostReact {
    tenantId: string;
    postId: string;
    reactType: string;
    count: number;
}

export interface WebsocketLiveNewFeedPostReactEvent {
    broadcastId: string;
    type: 'fr';
    timestamp: number;
    feedPostReact: WebsocketLiveFeedPostReact;
}

export interface WebsocketLiveDeletedFeedPostReactEvent {
    broadcastId: string;
    type: 'dfr';
    timestamp: number;
    feedPostReact: WebsocketLiveFeedPostReact;
}

export type WebsocketLiveEvent = WebsocketLiveNewBadgeEvent
    | WebsocketLiveRemovedBadgeEvent
    | WebsocketLiveNotificationEvent
    | WebsocketLivePresenceUpdate
    | WebsocketLiveNewVoteEvent
    | WebsocketLiveDeletedVoteEvent
    | WebsocketLiveDeletedCommentEvent
    | WebsocketLiveNewOrUpdatedCommentEvent
    | WebsocketLiveNewConfigEvent
    | WebsocketLiveNewFeedPostEvent
    | WebsocketLiveUpdatedFeedPostEvent
    | WebsocketLiveDeletedFeedPostEvent
    | WebsocketLiveNewFeedPostReactEvent
    | WebsocketLiveDeletedFeedPostReactEvent;
