import {CommonHTTPResponse} from "./common-http-response";

export interface CommentVoteDeleteResponse extends CommonHTTPResponse {
    wasPendingVote?: boolean
}
