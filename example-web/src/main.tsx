import * as React from 'react';
import { useState } from 'react';
import { AppRegistry } from 'react-native';
import { FastCommentsLiveCommenting, FastCommentsLiveChat, getDarkTheme } from '../../index';
import type { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';

// Browser equivalent of example/src/AppCommenting.tsx. Routes API calls
// through the Vite dev proxy so localhost dev avoids CORS.
// Query params: ?theme=dark renders the dark token set, ?widget=chat renders
// the FastCommentsLiveChat preset widget, ?urlId= points at another page.
function AppCommentingWeb() {
  const [config] = useState<FastCommentsCommentWidgetConfig>(() => {
    const search = new URLSearchParams(window.location.search);
    const sort = search.get('sort') as 'OF' | 'NF' | 'MR' | null;
    return {
      tenantId: 'demo',
      urlId: search.get('urlId') || 'native-test',
      showLiveRightAway: true,
      countAll: true,
      apiHost: '/_fc',
      // Authenticate as a simple-SSO user (like our other tests/demos) so the
      // composer posts as an identified user and the online-users facepile shows.
      simpleSSO: {
        username: 'Demo User',
        email: 'demo-user@fctest.com',
        avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
      },
      // ?sort=OF|NF|MR overrides the default sort. Only set it when present so we
      // don't pass `defaultSortDirection: undefined`, which would clobber the
      // chat preset's 'NF' and break live-chat detection.
      ...(sort ? { defaultSortDirection: sort } : {}),
    } as FastCommentsCommentWidgetConfig;
  });

  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme') === 'dark' ? getDarkTheme() : undefined;
  // Default to the live chat widget for testing; ?widget=comments shows the
  // threaded commenting widget.
  if (params.get('widget') === 'comments') {
    return <FastCommentsLiveCommenting config={config} theme={theme} />;
  }
  return <FastCommentsLiveChat config={config} theme={theme} />;
}

const appName = 'FastcommentsReactNativeWebExample';

AppRegistry.registerComponent(appName, () => AppCommentingWeb);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
