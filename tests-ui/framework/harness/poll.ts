/**
 * Polling helpers that mirror the Android UITestBase `pollUntil` cadence
 * (50ms-250ms tick, 10-15s deadline).
 */

export interface PollOptions {
    timeoutMs?: number;
    intervalMs?: number;
    label?: string;
}

export async function pollUntil(
    fn: () => boolean | Promise<boolean>,
    opts: PollOptions = {}
): Promise<void> {
    const timeoutMs = opts.timeoutMs ?? 15000;
    const intervalMs = opts.intervalMs ?? 250;
    const start = Date.now();
    let lastErr: unknown;
    while (Date.now() - start < timeoutMs) {
        try {
            if (await fn()) return;
        } catch (e) {
            lastErr = e;
        }
        await sleep(intervalMs);
    }
    const elapsed = Date.now() - start;
    const where = opts.label ? ` (${opts.label})` : '';
    const tail = lastErr ? ` lastError=${(lastErr as Error).message}` : '';
    throw new Error(`pollUntil timed out after ${elapsed}ms${where}.${tail}`);
}

export async function pollFor<T>(
    fn: () => T | undefined | Promise<T | undefined>,
    opts: PollOptions = {}
): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? 15000;
    const intervalMs = opts.intervalMs ?? 250;
    const start = Date.now();
    let lastErr: unknown;
    while (Date.now() - start < timeoutMs) {
        try {
            const v = await fn();
            if (v !== undefined && v !== null) return v;
        } catch (e) {
            lastErr = e;
        }
        await sleep(intervalMs);
    }
    const elapsed = Date.now() - start;
    const where = opts.label ? ` (${opts.label})` : '';
    const tail = lastErr ? ` lastError=${(lastErr as Error).message}` : '';
    throw new Error(`pollFor timed out after ${elapsed}ms${where}.${tail}`);
}

export function sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
}
