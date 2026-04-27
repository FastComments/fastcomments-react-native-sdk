import {CommonHTTPResponse} from "./common-http-response";

export interface BlockCommentResponse extends CommonHTTPResponse {
    // map of comment id -> isBlocked
    commentStatuses: Record<string, boolean>
}
