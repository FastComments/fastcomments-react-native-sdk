import {CommonHTTPResponse} from "../../services/http";

export interface CheckedBlockedCommentsResponse extends CommonHTTPResponse {
    commentStatuses: Record<string, boolean>
}
