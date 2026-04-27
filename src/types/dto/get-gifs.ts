import {CommonHTTPResponse} from "./common-http-response";

export interface GetGifsResponse extends CommonHTTPResponse {
    // source, width, height
    images: [string, number, number][]
}
