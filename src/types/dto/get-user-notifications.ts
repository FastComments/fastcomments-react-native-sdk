import {CommonHTTPResponse} from "./common-http-response";
import {UserNotification} from "../user-notification";

export interface GetUserNotificationsResponse extends CommonHTTPResponse {
    notifications: UserNotification[];
    isSubscribed: boolean;
}
