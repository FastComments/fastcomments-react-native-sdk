import {getPrettyDate} from "./pretty-date";
import {FastCommentsCommentWidgetConfig} from "fastcomments-typescript";

export function getDisplayDate(config: FastCommentsCommentWidgetConfig, translations: Record<string, string>, dateObj: Date) {
    if (config.absoluteAndRelativeDates) {
        return getPrettyDate(translations, dateObj.valueOf()) + '<span class="abs-date">' + dateObj.toLocaleDateString() + '</span>';
    } else if (config.absoluteDates) {
        return dateObj.toLocaleDateString();
    } else {
        return getPrettyDate(translations, dateObj.valueOf());
    }
}
