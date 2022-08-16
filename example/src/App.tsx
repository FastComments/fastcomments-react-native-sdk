import * as React from 'react';

import {FastCommentsLiveCommenting} from '../../index';
import {useState} from "react";

export default function App() {
  const myTenantId = 'demo'; // Your tenant id. Can be fetched from https://fastcomments.com/auth/my-account/api-secret
  const myAppPageId = 'native-test'; // the ID or URL of the comment thread in your app.

  const [config] = useState({
    tenantId: myTenantId,
    urlId: myAppPageId
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
    <FastCommentsLiveCommenting config={config}/>
  );
}
