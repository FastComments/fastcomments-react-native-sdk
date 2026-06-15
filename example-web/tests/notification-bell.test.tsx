/**
 * Web-lane behavior test for the notification bell: clicking it opens the list
 * as an anchored popover under the icon (portaled, absolutely positioned) rather
 * than the native full-screen centered modal, and a true outside click dismisses
 * it - the same dropdown pattern as the comment/sort menus.
 *
 * The notifications network calls are mocked so the test exercises only the
 * open/anchor/dismiss surface, not the backend.
 */
import * as React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../src/services/notifications', () => ({
    getUserNotifications: async () => ({ notifications: [], isSubscribed: false }),
    getNotificationTranslations: async () => ({ translations: {} }),
    changePageSubscriptionStateForUser: async () => ({ status: 'success' }),
    getUserUnreadNotificationCount: async () => ({ count: 0 }),
}));

import { NotificationBell } from '../../src/components/notification-bell';
import { FastCommentsLiveCommentingService } from '../../src/services/fastcomments-live-commenting';
import { getDefaultFastCommentsStyles } from '../../src/resources/styles';
import { getDefaultImageAssets } from '../../src/resources/default-image-assets';

afterEach(cleanup);

function renderBell() {
    const store = FastCommentsLiveCommentingService.createStoreFromConfig({
        tenantId: 'demo',
        urlId: 'notification-bell-web',
        apiHost: 'https://fastcomments.com',
    });
    return render(
        <NotificationBell
            imageAssets={getDefaultImageAssets()}
            store={store}
            styles={getDefaultFastCommentsStyles()}
            translations={{}}
        />
    );
}

describe('NotificationBell web dropdown', () => {
    it('opens the list as an anchored popover under the bell', async () => {
        const { getByTestId, queryByTestId } = renderBell();
        expect(queryByTestId('notificationListDropdown')).toBeNull();
        fireEvent.click(getByTestId('notificationBellButton'));
        await waitFor(() => expect(queryByTestId('notificationListDropdown')).not.toBeNull());
        // Anchored popover, not the centered full-screen modal path.
        expect(getByTestId('notificationListDropdown').style.position).toBe('absolute');
    });

    it('dismisses on a true outside click', async () => {
        const { getByTestId, queryByTestId } = renderBell();
        fireEvent.click(getByTestId('notificationBellButton'));
        await waitFor(() => expect(queryByTestId('notificationListDropdown')).not.toBeNull());
        fireEvent.click(document.body);
        await waitFor(() => expect(queryByTestId('notificationListDropdown')).toBeNull());
    });
});
