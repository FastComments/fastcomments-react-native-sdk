import {CommonHTTPResponse} from "../../services/http";

export interface GetTranslationsResponse extends CommonHTTPResponse {
    translations?: Record<string, string>
}
