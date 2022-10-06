import {CommonHTTPResponse} from "../../services/http";

export interface GetTranslationsResponse<KEY_TYPE extends string> extends CommonHTTPResponse {
    translations?: Record<KEY_TYPE, string>
}
