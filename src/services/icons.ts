import {FastCommentsIconType, IconConfig} from "../types/icon";

export function resolveIcon(iconConfig: IconConfig, type: FastCommentsIconType) {
    return iconConfig[type];
}
