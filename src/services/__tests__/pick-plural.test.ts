import { pickPlural } from '../pick-plural';

describe('pickPlural', () => {
    it('uses the one and other forms for English', () => {
        expect(pickPlural(1, 'en_us', 'one', 'other')).toBe('one');
        expect(pickPlural(0, 'en_us', 'one', 'other')).toBe('other');
        expect(pickPlural(2, 'en_us', 'one', 'other')).toBe('other');
    });

    it('picks the two, few and many forms where the locale has them', () => {
        expect(pickPlural(2, 'ar', 'one', 'other', 'two', 'few', 'many')).toBe('two');
        expect(pickPlural(3, 'ar', 'one', 'other', 'two', 'few', 'many')).toBe('few');
        expect(pickPlural(11, 'ar', 'one', 'other', 'two', 'few', 'many')).toBe('many');
        expect(pickPlural(100, 'ar', 'one', 'other', 'two', 'few', 'many')).toBe('other');
    });

    it('falls back to other when the locale leaves a form undefined', () => {
        expect(pickPlural(3, 'ar', 'one', 'other')).toBe('other');
        expect(pickPlural(21, 'ru_ru', undefined, 'other')).toBe('other');
    });

    it('accepts underscore locale ids and survives malformed ones', () => {
        expect(pickPlural(3, 'sr_latn_rs', 'one', 'other', undefined, 'few')).toBe('few');
        expect(pickPlural(1, 'en_US.UTF-8', 'one', 'other')).toBe('one');
        expect(pickPlural(1, undefined, 'one', 'other')).toBe('one');
    });
});
