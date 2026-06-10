import * as React from 'react';
import { useState } from 'react';
import { AppRegistry } from 'react-native';
import { FastCommentsLiveCommenting, FastCommentsLiveChat, getDarkTheme } from '../../index';
import type { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';

// Browser equivalent of example/src/AppCommenting.tsx. Routes API calls
// through the Vite dev proxy so localhost dev avoids CORS.
// Query params: ?theme=dark renders the dark token set, ?widget=chat renders
// the FastCommentsLiveChat preset widget.
function AppCommentingWeb() {
  const [config] = useState<FastCommentsCommentWidgetConfig>({
    tenantId: 'demo',
    urlId: 'native-test',
    showLiveRightAway: true,
    countAll: true,
    apiHost: '/_fc',
  } as FastCommentsCommentWidgetConfig);

  const params = new URLSearchParams(window.location.search);
  const theme = params.get('theme') === 'dark' ? getDarkTheme() : undefined;
  if (params.get('widget') === 'chat') {
    return <FastCommentsLiveChat config={config} theme={theme} />;
  }
  return <FastCommentsLiveCommenting config={config} theme={theme} />;
}

const appName = 'FastcommentsReactNativeWebExample';

AppRegistry.registerComponent(appName, () => AppCommentingWeb);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
