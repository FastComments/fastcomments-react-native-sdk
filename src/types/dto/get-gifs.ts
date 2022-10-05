import {CommonHTTPResponse} from "../../services/http";

export interface GetGifsResponse extends CommonHTTPResponse {
    // source, width, height
    images: [string, number, number][]
}
