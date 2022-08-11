import {CommonHTTPResponse} from "../../services/http";
import {
    WebsocketLiveDeletedCommentEvent,
    WebsocketLiveDeletedVoteEvent,
    WebsocketLiveNewOrUpdatedCommentEvent,
    WebsocketLiveNewVoteEvent
} from "./websocket-live-event";

// these are the only events stored in the event log, others are ephemeral (not important if missed).
export type EventLogEntryData =
    | WebsocketLiveNewVoteEvent
    | WebsocketLiveDeletedVoteEvent
    | WebsocketLiveDeletedCommentEvent
    | WebsocketLiveNewOrUpdatedCommentEvent;

export interface EventLogEntry {
    _id: string;
    createdAt: string;
    tenantId: string;
    urlId: string;
    broadcastId: string;
    data: string; // a serialized EventLogEntryData
}

export interface GetEventLogResponse extends CommonHTTPResponse {
    events?: EventLogEntry[]
}
