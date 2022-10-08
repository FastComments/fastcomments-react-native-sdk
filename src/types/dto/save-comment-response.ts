import {CommonHTTPResponse} from "../../services/http";
import { FastCommentsWidgetComment, FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';
import {FastCommentsSessionUser} from "../user";

export interface SaveCommentResponse extends CommonHTTPResponse {
    userIdWS?: string;
    comment?: FastCommentsWidgetComment;
    user?: FastCommentsSessionUser;
    customConfig?: FastCommentsCommentWidgetConfig;
    translations?: Record<string, string>; // REFACTOR: When do we do this? Ideally replace with translatedError? Web client has same structure.
    bannedUntil?: number; // unix time ms
    translatedError?: string;
    maxCharacterLength?: number; // sent when client sends comment that exceeds max character length on server, in case value was updated since client was last loaded
}
