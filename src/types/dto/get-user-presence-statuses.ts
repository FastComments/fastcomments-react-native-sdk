import {CommonHTTPResponse} from "../../services/http";

export interface GetUserPresenceStatusesResponse extends CommonHTTPResponse {
    userIdsOnline: Record<string, boolean>
}
