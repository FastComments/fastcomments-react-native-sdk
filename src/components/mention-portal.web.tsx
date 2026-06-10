import * as React from 'react';
// `react-dom` is only present in a web bundler context (it's a react-native-web
// peer). The SDK's own tsconfig has no react-dom installed, so suppress the
// resolution error here; web bundlers (vite/webpack) resolve it fine.
// @ts-ignore - resolved by the web bundler, not the SDK's tsconfig
import { createPortal } from 'react-dom';

/**
 * Render the mention dropdown into document.body. The composer lives inside the
 * scrollable, transformed comment list, which clips an absolutely/fixed
 * positioned popup and paints later comment-row cells on top of it. Portaling to
 * body escapes that container entirely; the popup is then positioned via a fixed
 * style measured off the editor box (see comment-text-area `mentionOverlayStyle`).
 */
export function MentionPortal({ children }: { children: React.ReactNode }) {
    if (typeof document === 'undefined') return <>{children}</>;
    return createPortal(children, document.body);
}
