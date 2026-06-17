import { Platform } from 'react-native';
import type { FastCommentsRNConfig } from './sdk';

// Every widget demo authenticates as this Simple SSO user, so the composer posts
// as a known identity and the notification bell / online-users facepile appear.
// Simple SSO needs no server signing - just a user object on the config.
export const DEMO_SIMPLE_SSO = {
    username: 'Demo User',
    email: 'demo-user@fctest.com',
    avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
};

// Seeded thread (also used by screenshot.mjs) so the commenting demo shows real
// content out of the box. Chat and feed get their own pages so their very
// different message shapes don't bleed into each other.
export const SHOWCASE_URL_ID = 'fastcomments-rn-showcase-v3';
export const CHAT_URL_ID = 'fastcomments-rn-showcase-chat';
export const FEED_URL_ID = 'fastcomments-rn-showcase-feed';

export function buildConfig(urlId: string, overrides?: Partial<FastCommentsRNConfig>): FastCommentsRNConfig {
    return {
        tenantId: 'demo',
        urlId,
        showLiveRightAway: true,
        countAll: true,
        // In the browser, route through the Vite dev proxy ('/_fc' -> fastcomments.com)
        // to avoid CORS. Native builds talk to the host directly.
        ...(Platform.OS === 'web' ? { apiHost: '/_fc' } : {}),
        simpleSSO: DEMO_SIMPLE_SSO,
        ...overrides,
    };
}
