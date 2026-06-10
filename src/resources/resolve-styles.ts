import { defaultsDeep, cloneDeep } from 'lodash';
import { IFastCommentsStyles } from '../types/fastcomments-styles';
import { FastCommentsThemeOverrides } from '../types/fastcomments-theme';
import { getDefaultFastCommentsStyles } from './styles';
import { resolveTheme } from './themes';

/**
 * Resolve the effective style tree from the public `theme` + `styles` props.
 * With a theme, explicit styles merge on top of the themed tree; styles alone
 * replace the defaults entirely (the original pre-theme behavior, kept so
 * sparse-styles and skin users are unaffected).
 */
export function resolveStyles(styles?: IFastCommentsStyles, theme?: FastCommentsThemeOverrides): IFastCommentsStyles {
    if (theme) {
        const base = getDefaultFastCommentsStyles(resolveTheme(theme));
        if (styles) {
            const merged: IFastCommentsStyles = defaultsDeep(cloneDeep(styles), base);
            return merged;
        }
        return base;
    }
    return styles ?? getDefaultFastCommentsStyles();
}
