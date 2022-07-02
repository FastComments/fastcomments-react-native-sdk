import {CommonHTTPResponse} from "../../services/http";
import {UserNotification} from "../user-notification";

export interface GetUserNotificationsResponse extends CommonHTTPResponse {
    notifications: UserNotification[];
    isSubscribed: boolean;
}
