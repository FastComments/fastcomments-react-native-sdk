import {CommonHTTPResponse} from "./common-http-response";
import {FastCommentsCommentPositions} from "./websocket-live-event";

export interface PinCommentResponse extends CommonHTTPResponse {
    commentPositions?: FastCommentsCommentPositions
}
