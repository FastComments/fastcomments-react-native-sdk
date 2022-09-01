import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";
import {FastCommentsCallbacks, IFastCommentsStyles} from "../types";
import {defaultsDeep} from "lodash";

export function setupErebusDarkSkin(config: FastCommentsCommentWidgetConfig, styles: IFastCommentsStyles, callbacks: FastCommentsCallbacks) {
    defaultsDeep(config, {
        translations: {
            DAYS_AGO: 'd',
            WEEKS_AGO: 'w'
        },
        useSingleReplyField: true, // TODO
        disableToolbar: true, // TODO
        disableSuccessMessage: true,

        useSingleLineCommentInput: true, // TODO
        hasDarkBackground: true, // TODO
        allowAnonVotes: true, // TODO
        disableEmailInputs: true,
        disableNotificationBell: true,
        disableUnverifiedLabel: true,
        inputAfterComments: true,
        newCommentsToBottom: true,
    });
}
