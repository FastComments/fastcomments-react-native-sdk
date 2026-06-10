import { TextStyle } from 'react-native';

/**
 * Semantic design tokens for the SDK. The entire default style tree
 * (getDefaultFastCommentsStyles) is generated from one of these, so changing a
 * token restyles every widget consistently. Color names mirror the Android
 * SDK's FastCommentsTheme where the concepts match.
 */
export interface FastCommentsThemeColors {
    /** Widget root background. **/
    background: string;
    /** Chips, toolbars, header strips, secondary buttons. **/
    surface: string;
    /** Modals, sheets, popups. **/
    surfaceRaised: string;
    textPrimary: string;
    textSecondary: string;
    /** Hairline separators and input borders. **/
    border: string;
    inputBackground: string;
    /** Pressed/active fill for touchables. **/
    pressed: string;
    /** Accent color for primary actions. **/
    primary: string;
    /** Text/icons rendered on top of `primary` fills. **/
    onPrimary: string;
    link: string;
    danger: string;
    actionButton: string;
    replyButton: string;
    toggleRepliesButton: string;
    loadMoreButtonText: string;
    voteCount: string;
    voteCountZero: string;
    voteDivider: string;
    dialogHeaderBackground: string;
    dialogHeaderText: string;
    onlineIndicator: string;
    liveChatHeaderBackground: string;
    liveChatHeaderText: string;
    liveChatConnectedDot: string;
    liveChatDisconnectedDot: string;
    liveChatUserCountText: string;
}

export interface FastCommentsThemeSpacing {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
}

export interface FastCommentsThemeRadius {
    sm: number;
    md: number;
    lg: number;
    pill: number;
}

/** No token below `base`: the SDK does not render sub-base font sizes. */
export interface FastCommentsThemeFontSizes {
    base: number;
    body: number;
    lg: number;
    xl: number;
}

export interface FastCommentsThemeFontWeights {
    regular: TextStyle['fontWeight'];
    medium: TextStyle['fontWeight'];
    semibold: TextStyle['fontWeight'];
    bold: TextStyle['fontWeight'];
}

export interface FastCommentsThemeAvatarSizes {
    sm: number;
    md: number;
}

export interface FastCommentsTheme {
    colors: FastCommentsThemeColors;
    spacing: FastCommentsThemeSpacing;
    radius: FastCommentsThemeRadius;
    fontSize: FastCommentsThemeFontSizes;
    fontWeight: FastCommentsThemeFontWeights;
    avatar: FastCommentsThemeAvatarSizes;
}

/** Per-group partial overrides for the public `theme` prop. */
export interface FastCommentsThemeOverrides {
    colors?: Partial<FastCommentsThemeColors>;
    spacing?: Partial<FastCommentsThemeSpacing>;
    radius?: Partial<FastCommentsThemeRadius>;
    fontSize?: Partial<FastCommentsThemeFontSizes>;
    fontWeight?: Partial<FastCommentsThemeFontWeights>;
    avatar?: Partial<FastCommentsThemeAvatarSizes>;
}
