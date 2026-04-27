import {CommonHTTPResponse} from "./common-http-response";

export interface GetUserUnreadNotificationsCountResponse extends CommonHTTPResponse {
    count?: number
}
