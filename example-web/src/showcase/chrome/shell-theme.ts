// Visual tokens for the showcase chrome (rail, cards, code panels) - separate
// from the SDK widget theme. Ported from the React showcase's index.css so the
// two demos look like siblings. Web-only stacks (this app runs on react-native-web).

export type ThemeMode = 'light' | 'dark';

export interface ShellTheme {
    mode: ThemeMode;
    bg: string;
    panel: string;
    panelRaised: string;
    border: string;
    borderStrong: string;
    ink: string;
    inkDim: string;
    inkMute: string;
    accentA: string;
    accentB: string;
    accentC: string;
    railTint: string;
    subtle: string;
    codeBg: string;
    display: string;
    body: string;
    mono: string;
}

const FONT_DISPLAY = 'Manrope, system-ui, -apple-system, sans-serif';
const FONT_BODY = 'Inter, system-ui, -apple-system, sans-serif';
const FONT_MONO = 'ui-monospace, Menlo, Consolas, monospace';

export function getShellTheme(mode: ThemeMode): ShellTheme {
    if (mode === 'dark') {
        return {
            mode,
            bg: '#030303',
            panel: '#0d0d0d',
            panelRaised: '#121212',
            border: '#1f1f22',
            borderStrong: '#2a2a2f',
            ink: '#fcfcfc',
            inkDim: '#a6a6a6',
            inkMute: '#686868',
            accentA: '#5356ec',
            accentB: '#8453ed',
            accentC: '#53b7ee',
            railTint: 'rgba(83,86,236,0.22)',
            subtle: 'rgba(255,255,255,0.04)',
            codeBg: '#030303',
            display: FONT_DISPLAY,
            body: FONT_BODY,
            mono: FONT_MONO,
        };
    }
    return {
        mode,
        bg: '#f7f7f8',
        panel: '#ffffff',
        panelRaised: '#f1f1f4',
        border: '#e4e4e7',
        borderStrong: '#d4d4d8',
        ink: '#0b0b0f',
        inkDim: '#4a4a52',
        inkMute: '#8a8a93',
        accentA: '#5356ec',
        accentB: '#8453ed',
        accentC: '#53b7ee',
        railTint: 'rgba(83,86,236,0.10)',
        subtle: 'rgba(0,0,0,0.04)',
        codeBg: '#f7f7f8',
        display: FONT_DISPLAY,
        body: FONT_BODY,
        mono: FONT_MONO,
    };
}
