import {CommonHTTPResponse} from "./common-http-response";

export interface GetCommentTextResponse extends CommonHTTPResponse {
    commentText: string;
}
