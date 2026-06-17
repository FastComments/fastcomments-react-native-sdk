import type { ShellTheme, ThemeMode } from './chrome/shell-theme';

// Props every demo screen receives from the Showcase shell.
export interface ScreenProps {
    /** Global light/dark mode; drives the SDK widget theme. */
    mode: ThemeMode;
    /** Resolved chrome palette for the surrounding DemoChrome. */
    shell: ShellTheme;
    /** Height for the live-widget panel, sized to the viewport by the shell. */
    panelHeight: number;
}
