import type { RNComment } from '../../types/react-native-comment';
import { createFastCommentsStore } from '../create-store';
import type { FastCommentsStore } from '../types';

export function makeComment(overrides: Partial<RNComment> & { _id: string }): RNComment {
    return {
        parentId: null,
        userId: 'u1',
        urlId: 'url-1',
        tenantId: 't1',
        commenterName: 'Anon',
        comment: 'text',
        commentHTML: '<p>text</p>',
        date: new Date(0).toISOString() as unknown as any,
        votes: 0,
        votesUp: 0,
        votesDown: 0,
        ...overrides,
    } as RNComment;
}

export function makeTestStore(): FastCommentsStore {
    return createFastCommentsStore({
        apiHost: 'https://api.test',
        wsHost: 'wss://ws.test',
        config: { urlId: 'url-1', tenantId: 't1' } as any,
        currentUser: undefined as any,
        imageAssets: {} as any,
        isDemo: false,
        instanceId: 'inst-1',
    });
}

export function makeFixture(size: number, opts: { branch?: number } = {}): RNComment[] {
    const branch = opts.branch ?? 5;
    const out: RNComment[] = [];
    for (let i = 0; i < size; i++) {
        const parentIndex = i === 0 ? -1 : Math.max(0, Math.floor((i - 1) / branch));
        out.push(
            makeComment({
                _id: `c${i}`,
                parentId: parentIndex === -1 ? null : `c${parentIndex}`,
                userId: `u${i % 10}`,
            })
        );
    }
    return out;
}
