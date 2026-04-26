/**
 * In-process sync coordinator - the dual-instance equivalent of Android's
 * SyncClient. Because both "users" run in the same Jest process, we don't need
 * an HTTP coordination server; promise-based round/data passing suffices.
 */

type Round = string;

interface PendingReady {
    promise: Promise<void>;
    resolve: () => void;
}

export class TestSyncCoordinator {
    private readyByRoleRound = new Map<string, boolean>();
    private waitersByRoleRound = new Map<string, PendingReady>();
    private dataByRound = new Map<Round, unknown>();
    private waitersByRoundData = new Map<Round, Array<(v: unknown) => void>>();

    private key(role: string, round: Round) {
        return `${role}::${round}`;
    }

    signalReady(role: string, round: Round): void {
        const k = this.key(role, round);
        this.readyByRoleRound.set(k, true);
        const pending = this.waitersByRoleRound.get(k);
        if (pending) {
            pending.resolve();
            this.waitersByRoleRound.delete(k);
        }
    }

    async waitFor(role: string, round: Round, timeoutMs = 60000): Promise<void> {
        const k = this.key(role, round);
        if (this.readyByRoleRound.get(k)) return;
        let pending = this.waitersByRoleRound.get(k);
        if (!pending) {
            let resolveFn: () => void = () => {};
            const promise = new Promise<void>((resolve) => {
                resolveFn = resolve;
            });
            pending = { promise, resolve: resolveFn };
            this.waitersByRoleRound.set(k, pending);
        }
        await Promise.race([
            pending.promise,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`sync.waitFor timed out: role=${role} round=${round}`)),
                    timeoutMs
                )
            ),
        ]);
    }

    postData(round: Round, data: unknown): void {
        this.dataByRound.set(round, data);
        const waiters = this.waitersByRoundData.get(round);
        if (waiters) {
            for (const w of waiters) w(data);
            this.waitersByRoundData.delete(round);
        }
    }

    getData<T = unknown>(round: Round): T | undefined {
        return this.dataByRound.get(round) as T | undefined;
    }

    async awaitData<T = unknown>(round: Round, timeoutMs = 60000): Promise<T> {
        const existing = this.dataByRound.get(round);
        if (existing !== undefined) return existing as T;
        const waiters = this.waitersByRoundData.get(round) || [];
        const promise = new Promise<T>((resolve) => waiters.push(resolve as (v: unknown) => void));
        this.waitersByRoundData.set(round, waiters);
        return Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(
                    () => reject(new Error(`sync.awaitData timed out: round=${round}`)),
                    timeoutMs
                )
            ),
        ]);
    }
}
