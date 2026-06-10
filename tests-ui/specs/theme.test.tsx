/**
 * Tests for the FastCommentsTheme token layer: the `theme` prop generates the
 * style tree, explicit `styles` win over `theme`, and the legacy skin path
 * still works.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { FastCommentsLiveCommenting } from '../../src/components/live-commenting';
import { FastCommentsFeed } from '../../src/components/feed';
import { FastCommentsLiveChat } from '../../src/components/live-chat';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import { getDarkTheme } from '../../src/resources/themes';
import { setupDarkModeSkin } from '../../src/skins/darkmode';
import { setupTestContext, teardownTestContext, TestContext } from '../framework/harness/test-context';
import { buildSDKConfig } from '../framework/harness/build-config';
import { pollUntil } from '../framework/harness/poll';
import type { FastCommentsRNConfig, IFastCommentsStyles } from '../../src/types';

const hasKey = !!process.env.FC_E2E_API_KEY;
const maybe = hasKey ? describe : describe.skip;

interface FlatStyle {
    [key: string]: unknown;
}

function flattenStyle(style: unknown, out: FlatStyle): FlatStyle {
    if (Array.isArray(style)) {
        for (const entry of style) flattenStyle(entry, out);
    } else if (typeof style === 'object' && style !== null) {
        Object.assign(out, style);
    }
    return out;
}

// The widget's loading state renders [styles.root, styles.loadingOverlay];
// read the FIRST entry so we probe the root style, not the translucent overlay.
function rootBackground(json: ReturnType<ReturnType<typeof render>['toJSON']>): unknown {
    const node = Array.isArray(json) ? json[0] : json;
    if (!node) return undefined;
    const style = node.props.style;
    const rootEntry = Array.isArray(style) ? style[0] : style;
    return flattenStyle(rootEntry, {}).backgroundColor;
}

// Offline: an unreachable host keeps the widget in its loading state, which is
// enough to assert the themed root/loading styles without an API key.
function offlineConfig(): FastCommentsRNConfig {
    return {
        tenantId: 'offline-theme-test',
        urlId: 'offline',
        apiHost: 'http://127.0.0.1:1',
        disableLiveCommenting: true,
    };
}

describe('theme prop (offline)', () => {
    const theme = { colors: { background: '#0A0A0A', primary: '#FF5500' } };

    it('FastCommentsLiveCommenting renders the themed background', () => {
        const inst = render(<FastCommentsLiveCommenting config={offlineConfig()} theme={theme} />);
        expect(rootBackground(inst.toJSON())).toBe('#0A0A0A');
        inst.unmount();
    });

    it('FastCommentsFeed renders the themed background', () => {
        const inst = render(<FastCommentsFeed config={offlineConfig()} theme={theme} />);
        expect(rootBackground(inst.toJSON())).toBe('#0A0A0A');
        inst.unmount();
    });

    it('FastCommentsLiveChat renders the themed background', () => {
        const inst = render(<FastCommentsLiveChat config={offlineConfig()} theme={theme} />);
        expect(rootBackground(inst.toJSON())).toBe('#0A0A0A');
        inst.unmount();
    });

    it('explicit styles win over theme', () => {
        const styles: IFastCommentsStyles = { root: { backgroundColor: '#123456' } };
        const inst = render(
            <FastCommentsLiveCommenting config={offlineConfig()} theme={theme} styles={styles} />
        );
        expect(rootBackground(inst.toJSON())).toBe('#123456');
        inst.unmount();
    });

    it('legacy dark skin path still renders dark', () => {
        const config = offlineConfig();
        const styles = getDefaultFastCommentsStyles();
        setupDarkModeSkin(config, styles);
        const inst = render(<FastCommentsLiveCommenting config={config} styles={styles} />);
        expect(rootBackground(inst.toJSON())).toBe(getDarkTheme().colors.background);
        inst.unmount();
    });
});

maybe('theme prop (live)', () => {
    let ctx: TestContext;
    afterEach(async () => teardownTestContext(ctx));

    it('custom tokens reach the live status dot and reply button', async () => {
        ctx = await setupTestContext({ emailPrefix: 'theme', urlIdLabel: 'theme' });
        const ssoToken = ctx.ssoFor('userA');
        const config = buildSDKConfig({
            tenant: ctx.tenant,
            urlId: ctx.urlId,
            ssoToken,
            overrides: { showLiveStatus: true },
        });
        const inst = render(
            <FastCommentsLiveCommenting
                config={config}
                theme={{ colors: { primary: '#FF5500', liveChatConnectedDot: '#ABCDEF' } }}
            />
        );
        ctx.onTeardown(() => inst.unmount());

        await pollUntil(() => !!inst.queryByTestId('connectionStatusText'), {
            timeoutMs: 20000,
            label: 'live status bar rendered',
        });
        await pollUntil(
            () => {
                const dot = inst.queryByTestId('connectionDot');
                if (!dot) return false;
                return flattenStyle(dot.props.style, {}).backgroundColor === '#ABCDEF';
            },
            { timeoutMs: 30000, label: 'connected dot carries the themed color' }
        );
    }, 90000);
});
