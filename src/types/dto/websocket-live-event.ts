import {FastCommentsBadge, FastCommentsCommentWidgetConfig, FastCommentsWidgetComment } from "fastcomments-typescript";
import {UserNotification} from "../user-notification";

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
    type: 'presence-update';
    /** User ids joined. **/
    uj?: string[];
    /** User ids left. **/
    ul?: string[];
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

export type WebsocketLiveEvent = WebsocketLiveNewBadgeEvent
    | WebsocketLiveRemovedBadgeEvent
    | WebsocketLiveNotificationEvent
    | WebsocketLivePresenceUpdate
    | WebsocketLiveNewVoteEvent
    | WebsocketLiveDeletedVoteEvent
    | WebsocketLiveDeletedCommentEvent
    | WebsocketLiveNewOrUpdatedCommentEvent
    | WebsocketLiveNewConfigEvent;
