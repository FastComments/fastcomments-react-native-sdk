import {CommonHTTPResponse} from "./http";

export function getMergedTranslations(sourceTranslations: Record<string, string>, response: CommonHTTPResponse): Record<string, string> {
    let translations = sourceTranslations;
    if (response.translations) { // we will move some of these error messages to only be sent to client on error (LOGIN_TO_DELETE)
        translations = {
            ...translations,
            ...response.translations
        }
    }
    return translations;
}
