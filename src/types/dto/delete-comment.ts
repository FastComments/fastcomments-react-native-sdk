import {CommonHTTPResponse} from "../../services/http";
import { FastCommentsWidgetComment } from 'fastcomments-typescript';

export interface DeleteCommentResponse extends CommonHTTPResponse {
    hardRemoved: boolean,
    // we always hard remove now, but retaining incase we change that.
    comment: {
        isDeleted: boolean,
        comment: FastCommentsWidgetComment['comment'],
        commentHTML: FastCommentsWidgetComment['commentHTML'],
        commenterName: FastCommentsWidgetComment['commenterName'],
        userId: FastCommentsWidgetComment['userId'],
    }
}
