import { FastCommentsCommentWidgetConfig } from "fastcomments-typescript";

// this should be safe to call multiple times for the same config object
export function mergeSimpleSSO(config: FastCommentsCommentWidgetConfig) {
    if (config.simpleSSO !== undefined && config.simpleSSO !== null) {
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
