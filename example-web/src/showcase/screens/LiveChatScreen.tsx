import { useMemo, useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FastCommentsLiveChat, OnlineUsersList, getDarkTheme, getDefaultFastCommentsStyles, getLightTheme } from '../sdk';
import type { FastCommentsStore } from '../sdk';
import { DemoChrome } from '../chrome/DemoChrome';
import { buildConfig, CHAT_URL_ID } from '../demo-config';
import type { ScreenProps } from '../types';

const CODE = `import { FastCommentsLiveChat, OnlineUsersList, getDefaultFastCommentsStyles } from 'fastcomments-react-native-sdk';

const config = {
  tenantId: 'demo',
  urlId: 'your-chat-id',
  defaultSortDirection: 'NF', // newest at the bottom
  showLiveStatus: true,       // "Live" + online-user header strip
  simpleSSO: {
    username: 'Demo User',
    email: 'demo-user@fctest.com',
    avatar: 'https://i.pravatar.cc/200?u=fastcomments0',
  },
};

// Grab the chat's store and render the online-users list beside it from the
// same live presence state - no second connection needed. The store is a
// callable, so stash it via the functional updater (setStore(() => s)).
const [store, setStore] = useState(null);

<View style={{ flexDirection: 'row', flex: 1 }}>
  <View style={{ flex: 1 }}>
    <FastCommentsLiveChat config={config} onStoreReady={(s) => setStore(() => s)} />
  </View>
  {/* fill -> the list fills the sidebar column instead of a centered card */}
  {store && <View style={{ width: 260 }}><OnlineUsersList fill store={store} styles={getDefaultFastCommentsStyles()} /></View>}
</View>;`;

export function LiveChatScreen({ mode, shell, panelHeight }: ScreenProps) {
    const theme = mode === 'dark' ? getDarkTheme() : getLightTheme();
    const config = useMemo(() => buildConfig(CHAT_URL_ID, { defaultSortDirection: 'NF', showLiveStatus: true }), []);
    const listStyles = useMemo(() => getDefaultFastCommentsStyles(theme), [theme]);
    const [store, setStore] = useState<FastCommentsStore | null>(null);

    const { width } = useWindowDimensions();
    const sideBySide = width >= 900;

    return (
        <DemoChrome
            shell={shell}
            breadcrumb="Widgets / Live Chat"
            title="Live Chat"
            subtitle="The same SDK in a chat preset: a flat, chronological stream with newest messages at the bottom and infinite history. The online-users list is rendered alongside it - a second component driven by the chat's own live presence store."
            tags={[{ label: 'demo tenant' }, { label: 'simple sso', brand: true }, { label: 'online users' }]}
            panelHeight={panelHeight}
            code={CODE}
            codeLabel="LiveChatScreen.tsx"
        >
            <View style={{ flex: 1, flexDirection: sideBySide ? 'row' : 'column' }}>
                <View style={{ flex: 1 }}>
                    {/* The store is a callable (zustand bound hook); pass it via the
                        functional updater so useState stores it instead of invoking it. */}
                    <FastCommentsLiveChat key={mode} config={config} theme={theme} onStoreReady={(s) => setStore(() => s)} />
                </View>
                {store ? (
                    <>
                        <View style={sideBySide ? { width: 1, backgroundColor: shell.border } : { height: 1, backgroundColor: shell.border }} />
                        <View style={{ width: sideBySide ? 260 : '100%', height: sideBySide ? '100%' : 220 }}>
                            <OnlineUsersList fill showOffline store={store} styles={listStyles} />
                        </View>
                    </>
                ) : null}
            </View>
        </DemoChrome>
    );
}
