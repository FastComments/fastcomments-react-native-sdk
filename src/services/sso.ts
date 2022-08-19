import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";

export function mergeSimpleSSO(config: FastCommentsCommentWidgetConfig) {
    if (config.simpleSSO !== undefined) {
        // have to check email since gets mapped to id
        if (config.simpleSSO.email) {
            config.sso = {
                // @ts-ignore
                simpleSSOUser: config.simpleSSO
            };
        } else if (config.simpleSSO.loginURL || config.simpleSSO.loginCallback) {
            // @ts-ignore
            config.sso = config.simpleSSO;
        }
    }
}
