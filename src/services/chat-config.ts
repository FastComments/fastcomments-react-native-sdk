import type { FastCommentsRNConfig } from '../types/react-native-config';

/**
 * Build the FastCommentsLiveChat preset config. Undefined values in `config` do
 * NOT override the chat defaults (mirrors the web live-chat's "if undefined, use
 * the default"), so a host passing e.g. `defaultSortDirection: undefined` cannot
 * accidentally flip the SDK out of chat mode (isLiveChatStyle reads the merged
 * config). Real values still override.
 */
export function buildChatConfig(config: FastCommentsRNConfig): FastCommentsRNConfig {
    const overrides = Object.fromEntries(
        Object.entries(config).filter(([, v]) => v !== undefined)
    ) as Partial<FastCommentsRNConfig>;
    return {
        defaultSortDirection: 'NF',
        newCommentsToBottom: true,
        inputAfterComments: true,
        showLiveStatus: true,
        showLiveRightAway: true,
        enableInfiniteScrolling: true,
        maxReplyDepth: 0,
        disableVoting: true,
        ...overrides,
    } as FastCommentsRNConfig;
}
