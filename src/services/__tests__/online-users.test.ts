import { FastCommentsLiveCommentingService } from '../fastcomments-live-commenting';
import { applyOnlineUsersPresenceUpdate } from '../online-users';

// Drain the microtask queue so an awaited (already-resolved) mock + its
// continuation run, without depending on jest.advanceTimersByTimeAsync.
async function flushMicrotasks() {
    for (let i = 0; i < 5; i++) await Promise.resolve();
}

function makeStore() {
    // Pass a stub imageAssets so the store factory skips getDefaultImageAssets()
    // (which require()s .png files the jest unit env doesn't transform).
    return FastCommentsLiveCommentingService.createStoreFromConfig(
        { tenantId: 'demo', urlId: 'ou-unit', apiHost: 'https://fastcomments.com' } as any,
        {} as any
    );
}

describe('online-users incremental presence', () => {
    it('store.applyOnlineUsersPresence adds named joins, drops leaves, tracks anon + total', () => {
        const store = makeStore();
        store.getState().setOnlineUsers([{ id: 'a', displayName: 'Alice' }], 1, 0);

        store.getState().applyOnlineUsersPresence({ joinedNamed: ['b'], leftNamed: [], anonDelta: 2, totalCount: 5 });
        let st = store.getState();
        expect(st.onlineUsers.map((u) => u.id)).toEqual(['a', 'b']);
        expect(st.onlineUsersAnonCount).toBe(2);
        expect(st.onlineUsersTotalCount).toBe(5);

        // A duplicate join is a no-op for the list.
        store.getState().applyOnlineUsersPresence({ joinedNamed: ['b'], leftNamed: [], anonDelta: 0 });
        expect(store.getState().onlineUsers.length).toBe(2);

        // A leave drops the user; the anon count floors at 0.
        store.getState().applyOnlineUsersPresence({ joinedNamed: [], leftNamed: ['a'], anonDelta: -5, totalCount: 1 });
        st = store.getState();
        expect(st.onlineUsers.map((u) => u.id)).toEqual(['b']);
        expect(st.onlineUsersAnonCount).toBe(0);
    });

    it('store.upsertOnlineUsers fills placeholders but never adds new ids', () => {
        const store = makeStore();
        store.getState().setOnlineUsers([{ id: 'b', displayName: '' }], 1, 0);
        store.getState().upsertOnlineUsers([
            { id: 'b', displayName: 'Bob', avatarSrc: 'x' },
            { id: 'ghost', displayName: 'Should not appear' },
        ]);
        expect(store.getState().onlineUsers).toEqual([{ id: 'b', displayName: 'Bob', avatarSrc: 'x' }]);
    });

    it('parses the anon: prefix and clamps the total to >= 1', () => {
        const store = makeStore();
        applyOnlineUsersPresenceUpdate(store, { uj: ['u1', 'anon:x', 'anon:y'], ul: [], sc: 3 });
        const st = store.getState();
        expect(st.onlineUsers.map((u) => u.id)).toEqual(['u1']);
        expect(st.onlineUsersAnonCount).toBe(2);
        expect(st.onlineUsersTotalCount).toBe(3);
    });

    it('enriches joined named users via a single debounced getUsersInfo call', async () => {
        jest.useFakeTimers();
        try {
            const store = makeStore();
            const getUsersInfo = jest.fn().mockResolvedValue({
                status: 'success',
                users: [
                    { id: 'u1', displayName: 'User One', avatarSrc: 'a1' },
                    { id: 'u2', displayName: 'User Two' },
                ],
            });
            (store.getState().sdk.publicApi as any).getUsersInfo = getUsersInfo;

            // Two joins in the same burst should coalesce into one request.
            applyOnlineUsersPresenceUpdate(store, { uj: ['u1'], ul: [], sc: 1 });
            applyOnlineUsersPresenceUpdate(store, { uj: ['u2'], ul: [], sc: 2 });

            // Placeholders present immediately, names empty, before enrich fires.
            expect(store.getState().onlineUsers).toEqual([
                { id: 'u1', displayName: '' },
                { id: 'u2', displayName: '' },
            ]);
            expect(getUsersInfo).not.toHaveBeenCalled();

            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            expect(getUsersInfo).toHaveBeenCalledTimes(1);
            expect(getUsersInfo).toHaveBeenCalledWith({ tenantId: 'demo', ids: 'u1,u2' });
            expect(store.getState().onlineUsers).toEqual([
                { id: 'u1', displayName: 'User One', avatarSrc: 'a1' },
                { id: 'u2', displayName: 'User Two', avatarSrc: undefined },
            ]);
        } finally {
            jest.useRealTimers();
        }
    });

    it('does not re-add a user who left before enrich completed', async () => {
        jest.useFakeTimers();
        try {
            const store = makeStore();
            const getUsersInfo = jest.fn().mockResolvedValue({
                status: 'success',
                users: [{ id: 'u1', displayName: 'User One' }],
            });
            (store.getState().sdk.publicApi as any).getUsersInfo = getUsersInfo;

            applyOnlineUsersPresenceUpdate(store, { uj: ['u1'], ul: [], sc: 1 });
            // u1 leaves before the debounce fires.
            applyOnlineUsersPresenceUpdate(store, { uj: [], ul: ['u1'], sc: 0 });
            expect(store.getState().onlineUsers).toEqual([]);

            jest.advanceTimersByTime(500);
            await flushMicrotasks();

            // Even if the enrich response carries u1, it must not reappear.
            expect(store.getState().onlineUsers).toEqual([]);
        } finally {
            jest.useRealTimers();
        }
    });
});
