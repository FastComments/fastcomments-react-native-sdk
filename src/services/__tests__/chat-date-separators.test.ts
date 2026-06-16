import { interleaveDateSeparators, isDateSeparator, getDaySeparatorLabel } from '../chat-date-separators';
import type { RNComment } from '../../types/react-native-comment';

const c = (id: string, date: string) => ({ _id: id, date } as unknown as RNComment);

// Local-time strings (no Z) so the calendar-day grouping isn't shifted by timezone.
const day1a = '2026-06-15T10:00:00';
const day1b = '2026-06-15T20:00:00';
const day2 = '2026-06-16T09:00:00';

describe('interleaveDateSeparators', () => {
    it('inserts one separator before the first message of each day', () => {
        const out = interleaveDateSeparators([c('a', day1a), c('b', day1b)]);
        expect(out.length).toBe(3);
        expect(isDateSeparator(out[0])).toBe(true);
        expect(isDateSeparator(out[1])).toBe(false);
        expect((out[1] as RNComment)._id).toBe('a');
        expect((out[2] as RNComment)._id).toBe('b');
    });

    it('starts a new separator when the calendar day changes', () => {
        const out = interleaveDateSeparators([c('a', day1a), c('b', day2)]);
        expect(out.length).toBe(4);
        expect(isDateSeparator(out[0])).toBe(true);
        expect((out[1] as RNComment)._id).toBe('a');
        expect(isDateSeparator(out[2])).toBe(true);
        expect((out[3] as RNComment)._id).toBe('b');
    });

    it('returns an empty list unchanged', () => {
        expect(interleaveDateSeparators([])).toEqual([]);
    });
});

describe('getDaySeparatorLabel', () => {
    const atNoon = (offsetDays: number) => {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        d.setDate(d.getDate() - offsetDays);
        return d.toISOString();
    };

    it('labels today and yesterday', () => {
        expect(getDaySeparatorLabel(atNoon(0), {})).toBe('Today');
        expect(getDaySeparatorLabel(atNoon(1), {})).toBe('Yesterday');
    });

    it('uses translations when provided', () => {
        expect(getDaySeparatorLabel(atNoon(0), { TODAY: 'Hoy' })).toBe('Hoy');
    });

    it('falls back to a locale date for older days', () => {
        const label = getDaySeparatorLabel(atNoon(10), {});
        expect(label).not.toBe('Today');
        expect(label).not.toBe('Yesterday');
        expect(label.length).toBeGreaterThan(0);
    });
});
