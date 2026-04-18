import {findEditRegion, reconcileTextChange, toggleFormattingOnSelection, offsetToSpanPosition} from '../reconcile';
import {TextSpan, FormattingState, EMPTY_FORMATTING, spansToPlainText} from '../types';

describe('findEditRegion', () => {
    it('detects insertion at end', () => {
        const edit = findEditRegion('Hello', 'Hello world');
        expect(edit.deletedStart).toBe(5);
        expect(edit.deletedEnd).toBe(5);
        expect(edit.insertedText).toBe(' world');
    });

    it('detects insertion at beginning', () => {
        const edit = findEditRegion('world', 'Hello world');
        expect(edit.deletedStart).toBe(0);
        expect(edit.deletedEnd).toBe(0);
        expect(edit.insertedText).toBe('Hello ');
    });

    it('detects insertion in middle', () => {
        const edit = findEditRegion('Helo', 'Hello');
        expect(edit.deletedStart).toBe(3);
        expect(edit.deletedEnd).toBe(3);
        expect(edit.insertedText).toBe('l');
    });

    it('detects deletion at end', () => {
        const edit = findEditRegion('Hello world', 'Hello');
        expect(edit.deletedStart).toBe(5);
        expect(edit.deletedEnd).toBe(11);
        expect(edit.insertedText).toBe('');
    });

    it('detects deletion at beginning', () => {
        const edit = findEditRegion('Hello world', 'world');
        expect(edit.deletedStart).toBe(0);
        expect(edit.deletedEnd).toBe(6);
        expect(edit.insertedText).toBe('');
    });

    it('detects replacement', () => {
        const edit = findEditRegion('Hello world', 'Hello earth');
        expect(edit.deletedStart).toBe(6);
        expect(edit.deletedEnd).toBe(11);
        expect(edit.insertedText).toBe('earth');
    });

    it('handles identical strings', () => {
        const edit = findEditRegion('Hello', 'Hello');
        expect(edit.deletedStart).toBe(5);
        expect(edit.deletedEnd).toBe(5);
        expect(edit.insertedText).toBe('');
    });

    it('handles empty to non-empty', () => {
        const edit = findEditRegion('', 'Hello');
        expect(edit.deletedStart).toBe(0);
        expect(edit.deletedEnd).toBe(0);
        expect(edit.insertedText).toBe('Hello');
    });
});

describe('offsetToSpanPosition', () => {
    const spans: TextSpan[] = [
        {text: 'Hello '},  // 0-5
        {text: 'bold', bold: true},  // 6-9
        {text: ' world'},  // 10-15
    ];

    it('finds position in first span', () => {
        expect(offsetToSpanPosition(spans, 3)).toEqual({spanIndex: 0, offsetInSpan: 3});
    });

    it('finds position at span boundary', () => {
        expect(offsetToSpanPosition(spans, 6)).toEqual({spanIndex: 0, offsetInSpan: 6});
    });

    it('finds position in middle span', () => {
        expect(offsetToSpanPosition(spans, 8)).toEqual({spanIndex: 1, offsetInSpan: 2});
    });

    it('finds position at end', () => {
        expect(offsetToSpanPosition(spans, 16)).toEqual({spanIndex: 2, offsetInSpan: 6});
    });
});

describe('reconcileTextChange', () => {
    it('handles typing a character in a single span', () => {
        const spans: TextSpan[] = [{text: 'Hello'}];
        const result = reconcileTextChange(spans, 'Hello!', EMPTY_FORMATTING);
        expect(spansToPlainText(result.spans)).toBe('Hello!');
    });

    it('handles typing in bold when active formatting is bold', () => {
        const spans: TextSpan[] = [{text: 'Hello'}];
        const formatting: FormattingState = {...EMPTY_FORMATTING, bold: true};
        const result = reconcileTextChange(spans, 'Hello!', formatting);
        expect(result.spans.length).toBe(2);
        expect(result.spans[0].text).toBe('Hello');
        expect(result.spans[0].bold).toBeFalsy();
        expect(result.spans[1].text).toBe('!');
        expect(result.spans[1].bold).toBe(true);
    });

    it('handles backspace', () => {
        const spans: TextSpan[] = [{text: 'Hello'}];
        const result = reconcileTextChange(spans, 'Hell', EMPTY_FORMATTING);
        expect(spansToPlainText(result.spans)).toBe('Hell');
    });

    it('handles typing inside a bold span', () => {
        const spans: TextSpan[] = [
            {text: 'before '},
            {text: 'bold', bold: true},
            {text: ' after'},
        ];
        // Typing 'X' inside 'bold' -> 'boXld'
        const boldFormatting: FormattingState = {...EMPTY_FORMATTING, bold: true};
        const result = reconcileTextChange(spans, 'before boXld after', boldFormatting);
        expect(spansToPlainText(result.spans)).toBe('before boXld after');
    });

    it('handles deletion across span boundaries', () => {
        const spans: TextSpan[] = [
            {text: 'Hello '},
            {text: 'bold', bold: true},
            {text: ' world'},
        ];
        // Delete 'o bold w' -> 'Hellorld'
        const result = reconcileTextChange(spans, 'Hellorld', EMPTY_FORMATTING);
        expect(spansToPlainText(result.spans)).toBe('Hellorld');
    });

    it('handles replacement (autocomplete)', () => {
        const spans: TextSpan[] = [{text: 'Hel'}];
        // Autocomplete replaces 'Hel' with 'Hello'
        const result = reconcileTextChange(spans, 'Hello', EMPTY_FORMATTING);
        expect(spansToPlainText(result.spans)).toBe('Hello');
    });

    it('handles clearing all text', () => {
        const spans: TextSpan[] = [{text: 'Hello'}];
        const result = reconcileTextChange(spans, '', EMPTY_FORMATTING);
        expect(result.spans.length).toBe(1);
        expect(result.spans[0].text).toBe('');
    });

    it('updates inline image offsets on insertion before them', () => {
        const spans: TextSpan[] = [{text: 'AB'}];
        const inlineImages = new Map<number, string>();
        inlineImages.set(1, 'https://example.com/emoji.png');

        const result = reconcileTextChange(spans, 'AXB', EMPTY_FORMATTING, inlineImages);
        // Image was at offset 1 (before B). After inserting X at offset 1, image shifts to offset 2.
        expect(result.inlineImages.get(2)).toBe('https://example.com/emoji.png');
    });

    it('removes inline images when their offset is in deleted range', () => {
        const spans: TextSpan[] = [{text: 'ABC'}];
        const inlineImages = new Map<number, string>();
        inlineImages.set(1, 'https://example.com/emoji.png');

        // Delete 'B' at offset 1
        const result = reconcileTextChange(spans, 'AC', EMPTY_FORMATTING, inlineImages);
        expect(result.inlineImages.size).toBe(0);
    });
});

describe('toggleFormattingOnSelection', () => {
    it('returns null for cursor (no selection)', () => {
        const spans: TextSpan[] = [{text: 'Hello'}];
        expect(toggleFormattingOnSelection(spans, 3, 3, 'bold')).toBeNull();
    });

    it('applies bold to unformatted selection', () => {
        const spans: TextSpan[] = [{text: 'Hello world'}];
        const result = toggleFormattingOnSelection(spans, 0, 5, 'bold');
        expect(result).not.toBeNull();
        expect(result![0]).toEqual({text: 'Hello', bold: true});
        expect(result![1]).toEqual({text: ' world'});
    });

    it('removes bold from already bold selection', () => {
        const spans: TextSpan[] = [{text: 'Hello', bold: true}, {text: ' world'}];
        const result = toggleFormattingOnSelection(spans, 0, 5, 'bold');
        expect(result).not.toBeNull();
        // All text should now be non-bold and merged
        expect(result!.length).toBe(1);
        expect(result![0]).toEqual({text: 'Hello world'});
    });

    it('splits spans at selection boundaries', () => {
        const spans: TextSpan[] = [{text: 'Hello world'}];
        const result = toggleFormattingOnSelection(spans, 2, 8, 'bold');
        expect(result).not.toBeNull();
        expect(result!.length).toBe(3);
        expect(result![0]).toEqual({text: 'He'});
        expect(result![1]).toEqual({text: 'llo wo', bold: true});
        expect(result![2]).toEqual({text: 'rld'});
    });

    it('handles selection across multiple spans', () => {
        const spans: TextSpan[] = [
            {text: 'normal '},
            {text: 'bold', bold: true},
            {text: ' normal'},
        ];
        // Select across all three spans (7 + 4 + 7 = 18 chars)
        const result = toggleFormattingOnSelection(spans, 0, 18, 'italic');
        expect(result).not.toBeNull();
        for (const span of result!) {
            expect(span.italic).toBe(true);
        }
    });
});
