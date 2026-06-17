import * as React from 'react';
import { useState } from 'react';
import { AppRegistry } from 'react-native';
import { FastCommentsLiveCommenting, FastCommentsLiveChat, getDarkTheme } from '../../index';
import type { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';
import { Showcase } from './showcase/Showcase';
import { findWidget } from './showcase/registry';

// Legacy single-widget view (kept for screenshot.mjs and quick manual checks).
// Routes API calls through the Vite dev proxy so localhost dev avoids CORS.
// Query params: ?theme=dark renders the dark token set, ?widget=chat renders
// the FastCommentsLiveChat preset widget, ?urlId= points at another page.
function LegacyWidget() {
  const [config] = useState<FastCommentsCommentWidgetConfig>(() => {
    const search = new URLSearchParams(window.location.search);
    const sort = search.get('sort') as 'OF' | 'NF' | 'MR' | null;
    return {
      tenantId: 'demo',
      urlId: search.get('urlId') || 'native-test',
      showLiveRightAway: true,
      countAll: true,
      // Dev routes through the Vite proxy; the deployed bundle is same-origin
      // with fastcomments.com, so it uses the default host.
      ...(import.meta.env.DEV ? { apiHost: '/_fc' } : {}),
      simpleSSO: {
        username: 'Demo User',
        email: 'demo-user@fctest.com',
        avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
      },
      ...(sort ? { defaultSortDirection: sort } : {}),
    } as FastCommentsCommentWidgetConfig;
  });

  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme') === 'dark' ? getDarkTheme() : undefined;
  if (params.get('widget') === 'comments') {
    return <FastCommentsLiveCommenting config={config} theme={theme} />;
  }
  return <FastCommentsLiveChat config={config} theme={theme} />;
}

// Default entry: the component browser. When the legacy single-widget query
// params are present (as screenshot.mjs always passes), fall back to LegacyWidget
// so existing screenshots/manual flows keep working unchanged.
function Root() {
  const params = new URLSearchParams(window.location.search);
  const isLegacy = params.has('widget') || params.has('urlId') || params.has('sort');
  if (isLegacy) {
    return <LegacyWidget />;
  }
  return <Showcase initialKey={findWidget(params.get('screen'))} initialMode={params.get('theme') === 'dark' ? 'dark' : 'light'} />;
}

const appName = 'FastcommentsReactNativeWebExample';

AppRegistry.registerComponent(appName, () => Root);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
