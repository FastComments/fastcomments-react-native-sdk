import type { ComponentType } from 'react';
import type { ScreenProps } from './types';
import { LiveCommentingScreen } from './screens/LiveCommentingScreen';
import { LiveChatScreen } from './screens/LiveChatScreen';
import { FeedScreen } from './screens/FeedScreen';

export type WidgetKey = 'live-commenting' | 'live-chat' | 'feed';

export interface ShowcaseEntry {
    key: WidgetKey;
    label: string;
    hint: string;
    kind: string;
    Screen: ComponentType<ScreenProps>;
}

// Drives both the rail nav and the home grid. Order = display order.
export const WIDGETS: ShowcaseEntry[] = [
    {
        key: 'live-commenting',
        label: 'Live Commenting',
        hint: 'Threaded comments with GIFs, image attachments, and a notification bell',
        kind: 'widget',
        Screen: LiveCommentingScreen,
    },
    {
        key: 'live-chat',
        label: 'Live Chat',
        hint: 'Realtime flat chat stream with a live online-user header',
        kind: 'widget',
        Screen: LiveChatScreen,
    },
    {
        key: 'feed',
        label: 'Social Feed',
        hint: 'Posts, media uploads, and emoji reactions',
        kind: 'widget',
        Screen: FeedScreen,
    },
];

export function findWidget(key: string | null | undefined): WidgetKey | 'home' {
    const entry = WIDGETS.find((w) => w.key === key);
    return entry ? entry.key : 'home';
}
