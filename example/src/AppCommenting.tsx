// @ts-ignore - TODO REMOVE
import * as React from 'react';

import {FastCommentsLiveCommenting} from '../../index';
import {useState} from "react";
import { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';
import {ScrollView} from "react-native";

/**
 * @description More traditional commenting-style widget, with input area at top and comments at bottom.
 */
export default function AppCommenting() {
  const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
  const myAppPageId = 'native-test'; // the ID or URL of the comment thread in your app.

  const [config] = useState<FastCommentsCommentWidgetConfig>({
    tenantId: myTenantId,
    urlId: myAppPageId,
    showLiveRightAway: true
  });

  // Uncomment this to test changing pages without reloading the whole widget.
  // We could use this to change the logged in user, as well.
  // useEffect(() => {
  //   setTimeout(function () {
  //     setConfig({
  //       ...config,
  //       urlId: 'new-page-id'
  //     });
  //   }, 2000);
  // }, []);

  return (
      <ScrollView style={{margin: 5}}><FastCommentsLiveCommenting config={config}/></ScrollView>
  );
}
