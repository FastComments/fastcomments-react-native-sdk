import { buildChatConfig } from '../chat-config';
import { isLiveChatStyle } from '../fastcomments-live-commenting';
import type { FastCommentsRNConfig } from '../../types/react-native-config';

const base = { tenantId: 't', urlId: 'u' } as FastCommentsRNConfig;

describe('buildChatConfig', () => {
    it('applies the chat defaults', () => {
        const c = buildChatConfig(base);
        expect(c.defaultSortDirection).toBe('NF');
        expect(c.newCommentsToBottom).toBe(true);
        expect(c.maxReplyDepth).toBe(0);
        expect(isLiveChatStyle(c)).toBe(true);
    });

    it('does NOT let an explicit `undefined` clobber a chat default', () => {
        // The regression: a host (or the demo) passing `defaultSortDirection: undefined`
        // must not flip the widget out of chat mode.
        const c = buildChatConfig({ ...base, defaultSortDirection: undefined, newCommentsToBottom: undefined });
        expect(c.defaultSortDirection).toBe('NF');
        expect(c.newCommentsToBottom).toBe(true);
        expect(isLiveChatStyle(c)).toBe(true);
    });

    it('respects real overrides', () => {
        const c = buildChatConfig({ ...base, defaultSortDirection: 'OF', showLiveStatus: false });
        expect(c.defaultSortDirection).toBe('OF');
        expect(c.showLiveStatus).toBe(false);
        expect(isLiveChatStyle(c)).toBe(false);
    });
});
