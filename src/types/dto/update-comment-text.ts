import {CommonHTTPResponse} from "./common-http-response";

export interface UpdateCommentTextResponse extends CommonHTTPResponse {
    comment: {
        approved: boolean;
        comment: string;
        commentHTML: string;
    }
}
