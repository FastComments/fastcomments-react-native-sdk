import {CommonHTTPResponse} from "../../services/http";

export interface CommentVoteDeleteResponse extends CommonHTTPResponse {
    wasPendingVote?: boolean
}
