// @ts-ignore - TODO REMOVE
import * as React from 'react';

import {FastCommentsCallbacks, FastCommentsLiveCommenting} from '../../index';
import {useState} from "react";
import { FastCommentsCommentWidgetConfig } from 'fastcomments-typescript';

/**
 * @description More traditional commenting-style widget, with input area at top and comments at bottom.
 */
export default function AppCommentingImageSelection() {
  const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
  const myAppPageId = 'test'; // the ID or URL of the comment thread in your app.

  const [config] = useState<FastCommentsCommentWidgetConfig>({
    tenantId: myTenantId,
    urlId: myAppPageId,
    showLiveRightAway: true,
  });

  const callbacks: FastCommentsCallbacks = {
      pickImage: async() => {
          // you can also return a FastCommentsFromDiskAsset, which maps to most popular react-native image picker libraries.
          return 'https://staticm.fastcomments.com/1663891248769-IMG_20200419_092549.jpg';
      }
  };

  return (
      <FastCommentsLiveCommenting config={config} callbacks={callbacks}/>
  );
}
