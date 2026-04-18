import type { StateCreator } from 'zustand';
import type { FastCommentsStoreState, NotificationsSlice } from '../types';

export const createNotificationsSlice: StateCreator<
    FastCommentsStoreState,
    [],
    [],
    NotificationsSlice
> = (set) => ({
    userNotificationState: {
        isOpen: false,
        isLoading: false,
        count: 0,
        notifications: [],
        isPaginationInProgress: false,
        isSubscribed: false,
    },

    setNotificationsOpen: (open) =>
        set((state) => ({
            userNotificationState: { ...state.userNotificationState, isOpen: open },
        })),

    setNotificationsLoading: (loading) =>
        set((state) => ({
            userNotificationState: { ...state.userNotificationState, isLoading: loading },
        })),

    setNotificationsCount: (count) =>
        set((state) => ({
            userNotificationState: { ...state.userNotificationState, count },
        })),

    setNotifications: (notifications) =>
        set((state) => ({
            userNotificationState: { ...state.userNotificationState, notifications },
        })),

    appendNotifications: (notifications) =>
        set((state) => ({
            userNotificationState: {
                ...state.userNotificationState,
                notifications: state.userNotificationState.notifications.concat(notifications),
            },
        })),

    setNotificationsPaginationInProgress: (inProgress) =>
        set((state) => ({
            userNotificationState: {
                ...state.userNotificationState,
                isPaginationInProgress: inProgress,
            },
        })),

    setNotificationsSubscribed: (subscribed) =>
        set((state) => ({
            userNotificationState: { ...state.userNotificationState, isSubscribed: subscribed },
        })),

    incNotificationCount: (delta) =>
        set((state) => ({
            userNotificationState: {
                ...state.userNotificationState,
                count: Math.max(0, state.userNotificationState.count + delta),
            },
        })),

    prependNotification: (notification) =>
        set((state) => ({
            userNotificationState: {
                ...state.userNotificationState,
                notifications: [notification, ...state.userNotificationState.notifications],
            },
        })),
});
