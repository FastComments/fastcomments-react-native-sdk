import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FastCommentsStore, FastCommentsStoreState } from './types';
import { createCommentsSlice } from './slices/comments';
import { createConfigSlice, ConfigSliceInitial } from './slices/config';
import { createPresenceSlice } from './slices/presence';
import { createNotificationsSlice } from './slices/notifications';

export function createFastCommentsStore(initial: ConfigSliceInitial): FastCommentsStore {
    return create<FastCommentsStoreState>()(
        subscribeWithSelector((set, get, api) => ({
            ...createCommentsSlice(set, get, api),
            ...createConfigSlice(initial)(set, get, api),
            ...createPresenceSlice(set, get, api),
            ...createNotificationsSlice(set, get, api),
        }))
    ) as FastCommentsStore;
}

export type { FastCommentsStore } from './types';
