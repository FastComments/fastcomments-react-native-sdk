import { FastCommentsCommentWidgetConfig, FastCommentsWidgetComment } from "fastcomments-typescript";
import {CommonHTTPResponse} from "../../services/http";
import {FastCommentsSessionUser} from "../user";
import {UserPresencePollStateEnum} from "../fastcomments-state";

export interface GetCommentsResponse extends CommonHTTPResponse {
    commentCount?: number;
    comments?: FastCommentsWidgetComment[];
    customConfig?: FastCommentsCommentWidgetConfig;
    hasBillingIssue?: boolean;
    includesPastPages?: boolean;
    isCommentsHidden?: boolean;
    isCrawler?: boolean;
    isDemo?: boolean;
    isProd?: boolean;
    isSiteAdmin?: boolean;
    isWhiteLabeled?: boolean;
    lastGenDate?: number;
    moderatingTenantIds?: string[];
    moduleData?: object;
    notificationCount?: boolean;
    pageNumber?: number;
    tenantIdWS?: string;
    urlIdClean?: string;
    urlIdWS?: string;
    user?: FastCommentsSessionUser;
    userIdWS?: string;
    presencePollState?: UserPresencePollStateEnum;
}
