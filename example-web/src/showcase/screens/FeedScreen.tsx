import { useMemo } from 'react';
import { FastCommentsFeed, getDarkTheme, getLightTheme } from '../sdk';
import { DemoChrome } from '../chrome/DemoChrome';
import { buildConfig, FEED_URL_ID } from '../demo-config';
import type { ScreenProps } from '../types';

const CODE = `import { FastCommentsFeed } from 'fastcomments-react-native-sdk';

const config = {
  tenantId: 'demo',
  urlId: 'your-feed-id',
  simpleSSO: {
    username: 'Demo User',
    email: 'demo-user@fctest.com',
    avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
  },
};

<FastCommentsFeed config={config} />;`;

export function FeedScreen({ mode, shell, panelHeight }: ScreenProps) {
    const theme = mode === 'dark' ? getDarkTheme() : getLightTheme();
    const config = useMemo(() => buildConfig(FEED_URL_ID), []);

    return (
        <DemoChrome
            shell={shell}
            breadcrumb="Widgets / Social Feed"
            title="Social Feed"
            subtitle="A social timeline: a post composer with media upload, emoji reactions, follow pills, and a 'new posts' banner. Posts here are authored by the Simple SSO demo user."
            tags={[{ label: 'demo tenant' }, { label: 'simple sso', brand: true }, { label: 'posts · reactions' }]}
            panelHeight={panelHeight}
            code={CODE}
            codeLabel="FeedScreen.tsx"
        >
            <FastCommentsFeed key={mode} config={config} theme={theme} />
        </DemoChrome>
    );
}
