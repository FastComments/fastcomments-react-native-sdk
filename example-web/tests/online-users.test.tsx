/**
 * Web-lane render tests for the live-chat online-users widgets. These render in
 * jsdom through react-native-web with a real store, injecting online users
 * (which in a live app come from getOnlineUsers / websocket presence).
 */
import * as React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { OnlineUsersFacepile } from '../../src/components/online-users-facepile';
import { OnlineUsersList } from '../../src/components/online-users-list';
import { FastCommentsLiveCommentingService } from '../../src/services/fastcomments-live-commenting';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';

afterEach(cleanup);

function storeWithOnlineUsers(count: number, total = count) {
    const store = FastCommentsLiveCommentingService.createStoreFromConfig({
        tenantId: 'demo',
        urlId: 'online-users-test',
        apiHost: 'https://fastcomments.com',
    });
    // The widgets self-load their snapshot on mount (ensureOnlineUsersLoaded);
    // stub the endpoint so these render-only tests never hit the network.
    (store.getState().sdk.publicApi as any).getOnlineUsers = async () => ({
        status: 'success',
        users: [],
        totalCount: total,
        anonCount: 0,
        nextAfterUserId: null,
        nextAfterName: null,
    });
    const users = Array.from({ length: count }, (_, i) => ({
        id: `u${i}`,
        displayName: `User ${i}`,
        avatarSrc: `https://i.pravatar.cc/100?img=${i + 1}`,
    }));
    store.getState().setOnlineUsers(users, total, 0);
    return store;
}

const styles = getDefaultFastCommentsStyles();

describe('OnlineUsersFacepile', () => {
    it('renders nothing when no one is online', () => {
        const store = storeWithOnlineUsers(0);
        const { queryByTestId } = render(<OnlineUsersFacepile store={store} styles={styles} />);
        expect(queryByTestId('onlineUsersFacepile')).toBeNull();
    });

    it('renders avatars and a "+N" overflow', () => {
        const store = storeWithOnlineUsers(6, 6);
        const { getByTestId } = render(<OnlineUsersFacepile store={store} styles={styles} max={4} />);
        expect(getByTestId('onlineUsersFacepile')).toBeTruthy();
        // 6 online, max 4 shown -> "+2"
        expect(getByTestId('onlineUsersFacepile').textContent).toContain('+2');
    });
});

describe('OnlineUsersList', () => {
    it('lists online users with names', () => {
        const store = storeWithOnlineUsers(3, 3);
        const { getByTestId } = render(<OnlineUsersList store={store} styles={styles} />);
        const text = getByTestId('onlineUsersList').textContent || '';
        expect(text).toContain('User 0');
        expect(text).toContain('User 2');
    });
});
