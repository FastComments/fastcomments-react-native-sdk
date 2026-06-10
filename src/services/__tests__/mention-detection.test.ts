import { detectMentionQuery, htmlToPlainText } from '../mention-detection';

describe('detectMentionQuery', () => {
    describe('plain text (legacy / native paths)', () => {
        it('returns the query after a leading @', () => {
            expect(detectMentionQuery('@a')).toBe('a');
            expect(detectMentionQuery('@alice')).toBe('alice');
        });

        it('returns the query after an @ at a word boundary', () => {
            expect(detectMentionQuery('hello @bob')).toBe('bob');
        });

        it('returns undefined with no @', () => {
            expect(detectMentionQuery('hello world')).toBeUndefined();
        });

        it('returns undefined when @ is mid-token (e.g. an email)', () => {
            expect(detectMentionQuery('me@example')).toBeUndefined();
        });

        it('terminates the mention on a trailing space', () => {
            expect(detectMentionQuery('@bob ')).toBeUndefined();
        });
    });

    // The web (tiptap) editor - and react-native-enriched generally - emit the
    // value wrapped in block elements (e.g. `<html><p>...</p></html>`). The
    // `</p>` becomes a trailing newline in plain text, which previously made the
    // detector bail and the mention popup never appear on web.
    describe('block-wrapped HTML (real editor output)', () => {
        it('detects a mention in <p>-wrapped HTML', () => {
            expect(detectMentionQuery('<p>@a</p>')).toBe('a');
            expect(detectMentionQuery('<p>@alice</p>')).toBe('alice');
        });

        it('detects a mention in the web build full-document HTML', () => {
            expect(detectMentionQuery('<html><p>@a</p></html>')).toBe('a');
            expect(detectMentionQuery('<html><p>hello @bob</p></html>')).toBe('bob');
        });

        it('still terminates on a trailing space inside block HTML', () => {
            expect(detectMentionQuery('<p>@bob </p>')).toBeUndefined();
        });

        it('does not trigger when the @ is on an earlier line/paragraph', () => {
            // User typed "@foo", pressed enter, and is now typing on a new line.
            expect(detectMentionQuery('<p>@foo</p><p>bar</p>')).toBeUndefined();
        });

        it('detects a mention typed on a later line', () => {
            expect(detectMentionQuery('<p>line one</p><p>@bob</p>')).toBe('bob');
        });
    });
});

describe('htmlToPlainText', () => {
    it('strips tags and decodes entities', () => {
        expect(htmlToPlainText('<p>a &amp; b</p>')).toBe('a & b\n');
        expect(htmlToPlainText('')).toBe('');
    });
});
