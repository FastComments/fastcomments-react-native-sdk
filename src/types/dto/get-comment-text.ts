import {CommonHTTPResponse} from "../../services/http";

export interface GetCommentTextResponse extends CommonHTTPResponse {
    commentText: string;
}
