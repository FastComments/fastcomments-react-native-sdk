import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";
import {CommonHTTPResponse} from "../../services/http";
import {FastCommentsComment} from "../comment";
import {FastCommentsSessionUser} from "../user";

export interface GetCommentsResponse extends CommonHTTPResponse {
    comments?: FastCommentsComment[];
    customConfig?: FastCommentsCommentWidgetConfig;
    user?: FastCommentsSessionUser;
    urlIdClean?: string;
    userIdWS?: string;
    urlIdWS?: string;
    lastGenDate?: number;
    includesPastPages?: boolean;
    isDemo?: boolean;
    commentCount?: number;
    isSiteAdmin?: boolean;
    hasBillingIssue?: boolean;
    isCommentsHidden?: boolean;
    moduleData?: object;
    pageNumber?: number;
    isWhiteLabeled?: boolean;
    isProd?: boolean;
    isCrawler?: boolean;
    notificationCount?: boolean;
}
