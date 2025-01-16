import { AppRegistry } from 'react-native';
import AppCommenting from './src/AppCommenting'; // regular commenting UI
// import AppCommentingImageSelection from './src/AppCommentingImageSelection'; // regular commenting UI with image select
// import AppCommentingSecureSSO from './src/AppCommentingSecureSSO'; // regular commenting UI + Secure SSO
// import AppSecureSSODarkChat from './src/AppSecureSSODarkChat'; // Dark "live-chat" style theme + Secure SSO
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => AppCommenting);
