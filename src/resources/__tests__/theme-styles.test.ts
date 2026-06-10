import { getDefaultFastCommentsStyles } from '../styles';
import { getLightTheme, getDarkTheme, resolveTheme } from '../themes';
import type { FastCommentsTheme } from '../../types/fastcomments-theme';

interface StyleRecord {
    [key: string]: unknown;
}

function isStyleRecord(value: unknown): value is StyleRecord {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Collect every nested style object in the generated tree. */
function collectStyleObjects(value: unknown, out: StyleRecord[]): StyleRecord[] {
    if (isStyleRecord(value)) {
        out.push(value);
        for (const key in value) {
            collectStyleObjects(value[key], out);
        }
    }
    return out;
}

describe('theme -> styles generation', () => {
    it('no-arg call equals the light theme call', () => {
        expect(getDefaultFastCommentsStyles()).toEqual(getDefaultFastCommentsStyles(getLightTheme()));
    });

    it('returns distinct instances on every call (no caching)', () => {
        const a = getDefaultFastCommentsStyles();
        const b = getDefaultFastCommentsStyles();
        expect(a).not.toBe(b);
        expect(a.root).not.toBe(b.root);
    });

    it('flows color tokens into representative style keys', () => {
        const theme: FastCommentsTheme = getLightTheme();
        theme.colors.primary = '#FF5500';
        theme.colors.liveChatConnectedDot = '#ABCDEF';
        theme.colors.background = '#0A0A0A';
        const styles = getDefaultFastCommentsStyles(theme);
        expect(styles.root?.backgroundColor).toBe('#0A0A0A');
        expect(styles.replyArea?.replyButton?.backgroundColor).toBe('#FF5500');
        expect(styles.liveStatusBar?.connectionDotConnected?.backgroundColor).toBe('#ABCDEF');
        expect(styles.feed?.composerSubmit?.backgroundColor).toBe('#FF5500');
    });

    it('flows spacing and radius tokens into representative keys', () => {
        const theme = getLightTheme();
        theme.radius.pill = 123;
        const styles = getDefaultFastCommentsStyles(theme);
        expect(styles.commentVote?.voteButton?.borderRadius).toBe(123);
    });

    it('resolveTheme merges per-group partials over the light base', () => {
        const resolved = resolveTheme({ colors: { primary: '#123456' } });
        expect(resolved.colors.primary).toBe('#123456');
        expect(resolved.colors.background).toBe(getLightTheme().colors.background);
        expect(resolved.spacing).toEqual(getLightTheme().spacing);
    });

    it('dark theme produces dark backgrounds end to end', () => {
        const styles = getDefaultFastCommentsStyles(getDarkTheme());
        const background = styles.root?.backgroundColor;
        expect(typeof background).toBe('string');
        expect(background).not.toBe('#FFFFFF');
        expect(styles.root?.backgroundColor).toBe(getDarkTheme().colors.background);
    });

    it('generates no sub-base font sizes, no text opacity, and no uppercase transforms', () => {
        const theme = getLightTheme();
        const styles = getDefaultFastCommentsStyles(theme);
        const styleObjects = collectStyleObjects(styles, []);
        for (const style of styleObjects) {
            const fontSize = style.fontSize;
            // fontSize 0 is the render-html display:none workaround, not small text.
            if (typeof fontSize === 'number' && fontSize !== 0) {
                expect(fontSize).toBeGreaterThanOrEqual(theme.fontSize.base);
                expect(style.opacity).toBeUndefined();
            }
            expect(style.textTransform).not.toBe('uppercase');
        }
    });
});
