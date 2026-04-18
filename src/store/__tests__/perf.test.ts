import { makeComment, makeFixture, makeTestStore } from './test-helpers';

// Perf micro-benches. These are kept as assertions with generous thresholds so
// they don't flake on slow CI hardware — the real point is to have a reproducible
// harness for local comparison against the old Hookstate implementation.
//
// Skipped by default. Run locally with:
//   FASTCOMMENTS_PERF=1 npx jest src/store/__tests__/perf.test.ts
declare const process: { env: Record<string, string | undefined> };
const runPerf = process.env.FASTCOMMENTS_PERF === '1';
const d = runPerf ? describe : describe.skip;

d('perf: live-event hot paths at 1000 comments', () => {
    it('100 sequential applyVote calls complete quickly', () => {
        const store = makeTestStore();
        store.getState().replaceAll(makeFixture(1000, { branch: 6 }), false);
        const start = Date.now();
        for (let i = 0; i < 100; i++) {
            store.getState().applyVote(`c${i}`, i, i, 0);
        }
        const elapsed = Date.now() - start;
        // eslint-disable-next-line no-console
        console.log(`[perf] 100 applyVote: ${elapsed}ms`);
        expect(elapsed).toBeLessThan(1000);
    });

    it('100 sequential upsertComment (new replies) complete quickly', () => {
        const store = makeTestStore();
        store.getState().replaceAll(makeFixture(1000, { branch: 6 }), false);
        const start = Date.now();
        for (let i = 0; i < 100; i++) {
            store.getState().upsertComment(
                makeComment({
                    _id: `new-${i}`,
                    parentId: `c${i % 200}`,
                    userId: `u${i % 5}`,
                }),
                true
            );
        }
        const elapsed = Date.now() - start;
        // eslint-disable-next-line no-console
        console.log(`[perf] 100 upsertComment: ${elapsed}ms`);
        expect(elapsed).toBeLessThan(2000);
    });
});
