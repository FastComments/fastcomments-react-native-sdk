import {CommonHTTPResponse} from "./common-http-response";

export interface CheckedBlockedCommentsResponse extends CommonHTTPResponse {
    commentStatuses: Record<string, boolean>
}
