import type { RNComment } from '../types/react-native-comment';

/** A day divider injected into the chat list between messages from different days. */
export interface DateSeparatorItem {
    _isSeparator: true;
    /** Stable key for the FlatList (one per calendar day). */
    _id: string;
    /** A representative date (string, as comments carry it) for the day, used for the label. */
    date: string;
}

export type ChatListItem = RNComment | DateSeparatorItem;

export function isDateSeparator(item: ChatListItem): item is DateSeparatorItem {
    return (item as DateSeparatorItem)._isSeparator === true;
}

// Comment dates are immutable, so the day-key for a given date string never
// changes. Memoize it: the interleave runs over the whole list on every new
// message, and without this each pass re-allocates a Date per comment. Bounded
// to avoid unbounded growth across a very long-lived session (it tracks distinct
// timestamps, which is already proportional to comments held in the store).
const dayKeyCache = new Map<string, string>();
const DAY_KEY_CACHE_MAX = 20_000;

function dayKey(dateStr: string): string {
    const cached = dayKeyCache.get(dateStr);
    if (cached !== undefined) return cached;
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKeyCache.size >= DAY_KEY_CACHE_MAX) dayKeyCache.clear();
    dayKeyCache.set(dateStr, key);
    return key;
}

/**
 * Insert a day separator before the first message of each calendar day. Expects
 * the chat order (oldest -> newest), so dividers read top-to-bottom like the web
 * live-chat. Comments without a parseable date are passed through untouched.
 */
export function interleaveDateSeparators(comments: RNComment[]): ChatListItem[] {
    const out: ChatListItem[] = [];
    let lastKey: string | undefined;
    for (const c of comments) {
        if (c.date) {
            const key = dayKey(c.date);
            if (key !== lastKey) {
                lastKey = key;
                out.push({ _isSeparator: true, _id: `sep-${key}`, date: c.date });
            }
        }
        out.push(c);
    }
    return out;
}

/** "Today" / "Yesterday" / locale date, like the web live-chat day dividers. */
export function getDaySeparatorLabel(dateStr: string, translations: Record<string, string>): string {
    const d = new Date(dateStr);
    const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000);
    if (diffDays === 0) return translations.TODAY;
    if (diffDays === 1) return translations.YESTERDAY;
    return d.toLocaleDateString();
}
