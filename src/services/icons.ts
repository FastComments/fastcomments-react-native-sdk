import {FastCommentsIconType, IconConfig} from "../types/icon";

// TODO optimize would taking a State<IconConfig> here be faster (and possible in all call sites?)?
export function resolveIcon(iconConfig: IconConfig, type: FastCommentsIconType) {
    return iconConfig[type];
}
