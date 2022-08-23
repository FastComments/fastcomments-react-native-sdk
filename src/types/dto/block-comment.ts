import {CommonHTTPResponse} from "../../services/http";

export interface BlockCommentResponse extends CommonHTTPResponse {
    // map of comment id -> isBlocked
    commentStatuses: Record<string, boolean>
}
