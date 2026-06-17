import { useMemo } from 'react';
import { FastCommentsLiveCommenting } from './live-commenting';
import { FastCommentsRNConfig } from '../types/react-native-config';
import { buildChatConfig } from '../services/chat-config';
import { FastCommentsThemeOverrides } from '../types/fastcomments-theme';
import { FastCommentsCallbacks, IFastCommentsStyles, ImageAssetConfig } from '../types';
import type { FastCommentsStore } from '../store/types';

export interface FastCommentsLiveChatProps {
    config: FastCommentsRNConfig;
    /** Semantic design tokens; generates the whole default style tree. **/
    theme?: FastCommentsThemeOverrides;
    /** Raw style overrides. With `theme`, merged on top of the themed tree; alone, replaces the defaults entirely. **/
    styles?: IFastCommentsStyles;
    callbacks?: FastCommentsCallbacks;
    assets?: ImageAssetConfig;
    /**
     * Called once with the internal store after it is created. Use it to render
     * store-driven widgets (e.g. OnlineUsersList) next to the chat against the
     * same live state.
     */
    onStoreReady?: (store: FastCommentsStore) => void;
}

/**
 * Chat preset over FastCommentsLiveCommenting, mirroring the Android SDK's
 * LiveChatView: chronological messages with new ones at the bottom, the
 * composer below the list, a live header strip (connection dot + user count),
 * infinite history instead of pagination buttons, flat (no replies), no votes.
 * Any of these presets can be overridden via `config`.
 */
export function FastCommentsLiveChat({ config, theme, styles, callbacks, assets, onStoreReady }: FastCommentsLiveChatProps) {
    const chatConfig = useMemo<FastCommentsRNConfig>(() => buildChatConfig(config), [config]);
    return (
        <FastCommentsLiveCommenting
            config={chatConfig}
            theme={theme}
            styles={styles}
            callbacks={callbacks}
            assets={assets}
            onStoreReady={onStoreReady}
        />
    );
}
