import {CommonHTTPResponse} from "./common-http-response";

export interface GetTranslationsResponse<KEY_TYPE extends string> extends CommonHTTPResponse {
    translations?: Record<KEY_TYPE, string>
}
