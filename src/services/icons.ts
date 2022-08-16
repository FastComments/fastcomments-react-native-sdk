import {FastCommentsIconType} from "../types/icon";

export function resolveIcon(iconConfig: Record<FastCommentsIconType, string>, type: FastCommentsIconType) {
    return `./../resources/icons/${iconConfig[type]}`;
}
