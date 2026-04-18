// Stub for react-native/Libraries/Utilities/codegenNativeComponent on web.
// Native components don't exist in the browser; return a placeholder
// component so callers' Platform.OS === 'ios' | 'android' guards skip use.
import { View } from 'react-native';
export default function codegenNativeComponent() {
  return View;
}
