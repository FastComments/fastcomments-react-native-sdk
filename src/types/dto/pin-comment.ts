import {CommonHTTPResponse} from "../../services/http";
import {FastCommentsCommentPositions} from "./websocket-live-event";

export interface PinCommentResponse extends CommonHTTPResponse {
    commentPositions?: FastCommentsCommentPositions
}
