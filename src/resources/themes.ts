import {
    FastCommentsTheme,
    FastCommentsThemeOverrides,
} from '../types/fastcomments-theme';

/** Modern-neutral light palette: zinc neutrals with a single blue accent. */
export function getLightTheme(): FastCommentsTheme {
    return {
        colors: {
            background: '#FFFFFF',
            surface: '#F4F4F5',
            surfaceRaised: '#FFFFFF',
            textPrimary: '#18181B',
            textSecondary: '#52525B',
            border: '#E4E4E7',
            inputBackground: '#FFFFFF',
            pressed: '#EBEBEE',
            // The web widget's buttons are off-black, not branded.
            primary: '#222222',
            onPrimary: '#FFFFFF',
            link: '#2563EB',
            danger: '#DC2626',
            actionButton: '#52525B',
            replyButton: '#222222',
            toggleRepliesButton: '#52525B',
            loadMoreButtonText: '#222222',
            voteCount: '#18181B',
            voteCountZero: '#52525B',
            voteDivider: '#E4E4E7',
            dialogHeaderBackground: '#FFFFFF',
            dialogHeaderText: '#18181B',
            onlineIndicator: '#16A34A',
            liveChatHeaderBackground: '#F4F4F5',
            liveChatHeaderText: '#18181B',
            liveChatConnectedDot: '#DC2626',
            liveChatDisconnectedDot: '#9CA3AF',
            liveChatUserCountText: '#52525B',
        },
        spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
        radius: { sm: 6, md: 10, lg: 16, pill: 999 },
        fontSize: { base: 14, body: 15, lg: 17, xl: 20 },
        fontWeight: { regular: '400', medium: '500', semibold: '600', bold: '700' },
        avatar: { sm: 28, md: 40 },
    };
}

export function getDarkTheme(): FastCommentsTheme {
    const theme = getLightTheme();
    theme.colors = {
        background: '#121316',
        surface: '#1C1E23',
        surfaceRaised: '#22242A',
        textPrimary: '#F4F4F5',
        textSecondary: '#A1A1AA',
        border: '#2E3138',
        inputBackground: '#1C1E23',
        pressed: '#2A2D34',
        primary: '#E4E4E7',
        onPrimary: '#18181B',
        link: '#60A5FA',
        danger: '#EF4444',
        actionButton: '#A1A1AA',
        replyButton: '#E4E4E7',
        toggleRepliesButton: '#A1A1AA',
        loadMoreButtonText: '#E4E4E7',
        voteCount: '#F4F4F5',
        voteCountZero: '#A1A1AA',
        voteDivider: '#2E3138',
        dialogHeaderBackground: '#22242A',
        dialogHeaderText: '#F4F4F5',
        onlineIndicator: '#22C55E',
        liveChatHeaderBackground: '#1C1E23',
        liveChatHeaderText: '#F4F4F5',
        liveChatConnectedDot: '#EF4444',
        liveChatDisconnectedDot: '#6B7280',
        liveChatUserCountText: '#A1A1AA',
    };
    return theme;
}

/** Perceived-luminance check used to derive dark-mode asset variants from a theme. */
export function isDarkColor(color: string): boolean {
    const hex = color.startsWith('#') ? color.slice(1) : color;
    if (hex.length !== 6) return false;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

/** Merge per-group partial overrides over a base theme (light by default). */
export function resolveTheme(
    overrides?: FastCommentsThemeOverrides,
    base?: FastCommentsTheme
): FastCommentsTheme {
    const b = base ?? getLightTheme();
    if (!overrides) return b;
    return {
        colors: { ...b.colors, ...overrides.colors },
        spacing: { ...b.spacing, ...overrides.spacing },
        radius: { ...b.radius, ...overrides.radius },
        fontSize: { ...b.fontSize, ...overrides.fontSize },
        fontWeight: { ...b.fontWeight, ...overrides.fontWeight },
        avatar: { ...b.avatar, ...overrides.avatar },
    };
}
