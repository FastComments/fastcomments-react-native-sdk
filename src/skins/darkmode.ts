import {IFastCommentsStyles} from "../types";
import {assign, defaultsDeep, merge} from "lodash";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {getDefaultFastCommentsStyles} from "../resources/styles";
import {getDarkTheme} from "../resources/themes";

/**
 * @deprecated Pass `theme` on the widget instead, e.g.
 * `<FastCommentsLiveCommenting theme={{colors: getDarkTheme().colors}}/>`, or
 * generate styles directly via `getDefaultFastCommentsStyles(getDarkTheme())`.
 */
export function setupDarkModeSkin(config: FastCommentsRNConfig, styles: IFastCommentsStyles) {
    defaultsDeep(config, {
        hasDarkBackground: true
    });
    const darkTree = getDefaultFastCommentsStyles(getDarkTheme());
    assign(styles, merge(styles, darkTree));
}
