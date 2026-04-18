import * as React from 'react';
import { useState } from 'react';
import { AppRegistry } from 'react-native';
import { FastCommentsLiveCommenting } from '../../index';
import type { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';

// Browser equivalent of example/src/AppCommenting.tsx. Routes API calls
// through the Vite dev proxy so localhost dev avoids CORS.
function AppCommentingWeb() {
  const [config] = useState<FastCommentsCommentWidgetConfig>({
    tenantId: 'demo',
    urlId: 'native-test',
    showLiveRightAway: true,
    countAll: true,
    apiHost: '/_fc',
  } as FastCommentsCommentWidgetConfig);

  return <FastCommentsLiveCommenting config={config} />;
}

const appName = 'FastcommentsReactNativeWebExample';

AppRegistry.registerComponent(appName, () => AppCommentingWeb);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById('root'),
});
