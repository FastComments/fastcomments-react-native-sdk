import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { FastCommentsFeed, FeedPostComposer, getDarkTheme, getLightTheme } from '../sdk';
import type { FastCommentsStore } from '../sdk';
import { DemoChrome } from '../chrome/DemoChrome';
import { buildConfig, FEED_URL_ID } from '../demo-config';
import type { ScreenProps } from '../types';

const CODE = `import { FastCommentsFeed, FeedPostComposer } from 'fastcomments-react-native-sdk';

const config = {
  tenantId: 'demo',
  urlId: 'your-feed-id',
  hideFeedComposer: true, // we render the composer ourselves, above the feed
  simpleSSO: { username: 'Demo User', email: 'demo-user@fctest.com' },
};

// Grab the feed's live store and drive a standalone composer from it - new
// posts appear instantly (same store). Mirrors Android's separate
// FeedPostCreateView + FastCommentsFeedView.
const [store, setStore] = useState(null);

<View style={{ flex: 1 }}>
  {store && (
    <FeedPostComposer
      store={store}
      tagSupplier={() => ['showcase']}
    />
  )}
  <FastCommentsFeed config={config} onStoreReady={(s) => setStore(() => s)} />
</View>;`;

export function FeedScreen({ mode, shell }: ScreenProps) {
    const theme = mode === 'dark' ? getDarkTheme() : getLightTheme();
    // Hide the built-in composer; we place a standalone one above the feed,
    // driven by the feed's own store (so new posts appear instantly).
    const config = useMemo(() => buildConfig(FEED_URL_ID, { hideFeedComposer: true }), []);
    const [store, setStore] = useState<FastCommentsStore | null>(null);

    return (
        <DemoChrome
            shell={shell}
            breadcrumb="Widgets / Social Feed"
            title="Social Feed"
            subtitle="A standalone post composer (rich text, media, links, tags, custom toolbar buttons) driven by the feed's own live store, plus posts with avatars, typed image layouts, reactions, comments, and share. Mirrors the Android SDK's separate FeedPostCreateView + FastCommentsFeedView."
            tags={[{ label: 'demo tenant' }, { label: 'simple sso', brand: true }, { label: 'standalone composer' }]}
            panelHeight={800}
            panelWidth={500}
            code={CODE}
            codeLabel="FeedScreen.tsx"
        >
            <View style={{ flex: 1 }}>
                {store ? (
                    <FeedPostComposer
                        store={store}
                        theme={theme}
                        tagSupplier={() => ['showcase']}
                    />
                ) : null}
                <FastCommentsFeed key={mode} config={config} theme={theme} onStoreReady={(s) => setStore(() => s)} />
            </View>
        </DemoChrome>
    );
}
