import {CommonHTTPResponse} from "../../services/http";

export interface UpdateCommentTextResponse extends CommonHTTPResponse {
    comment: {
        approved: boolean;
        comment: string;
        commentHTML: string;
    }
}
