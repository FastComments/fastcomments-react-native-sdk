import { useEffect, useState } from 'react';

type Subscriber = () => void;
const subscribers = new Set<Subscriber>();
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function ensureTicker() {
    if (intervalHandle !== null) return;
    intervalHandle = setInterval(() => {
        for (const sub of subscribers) sub();
    }, 60_000);
}

function maybeStopTicker() {
    if (subscribers.size === 0 && intervalHandle !== null) {
        clearInterval(intervalHandle);
        intervalHandle = null;
    }
}

/**
 * Single shared 60-second tick. Every relative-time display subscribes to the same
 * interval instead of each component owning its own setInterval. At 30 visible
 * comments this drops from 30 timers to 1.
 */
export function useRelativeTimeTick(): number {
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const sub = () => setTick((t) => (t + 1) % 1_000_000);
        subscribers.add(sub);
        ensureTicker();
        return () => {
            subscribers.delete(sub);
            maybeStopTicker();
        };
    }, []);
    return tick;
}
