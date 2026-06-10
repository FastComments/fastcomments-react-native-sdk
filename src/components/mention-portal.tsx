import * as React from 'react';

/**
 * Native (and any non-web bundler / jest) has no DOM portal, so render the
 * mention dropdown in place. The web variant (mention-portal.web.tsx) portals it
 * to document.body so it can escape the scrollable comment list.
 */
export function MentionPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
