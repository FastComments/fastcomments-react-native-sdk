import {CommonHTTPResponse} from "../../services/http";

export interface GetUserUnreadNotificationsCountResponse extends CommonHTTPResponse {
    count?: number
}
