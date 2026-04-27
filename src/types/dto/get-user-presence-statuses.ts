import {CommonHTTPResponse} from "./common-http-response";

export interface GetUserPresenceStatusesResponse extends CommonHTTPResponse {
    userIdsOnline: Record<string, boolean>
}
