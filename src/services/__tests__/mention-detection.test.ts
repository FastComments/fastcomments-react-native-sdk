import { detectMentionQuery, htmlToPlainText, replaceActiveMention } from '../mention-detection';

// Committed mentions end with a non-breaking space (so the trailing space isn't
// collapsed by the HTML editor). Tests assert against it explicitly.
const NBSP = '\u00a0';

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

        it('terminates at the first space - no re-trigger after a completed mention', () => {
            // After selecting a mention we insert "@name " as plain text; once the
            // user keeps typing ("@name hello") the query must NOT reactivate.
            expect(detectMentionQuery('@asdad hello')).toBeUndefined();
            expect(detectMentionQuery('<html><p>@asdad hello world</p></html>')).toBeUndefined();
        });

        it('treats a non-breaking space as a terminator too', () => {
            // The committed mention "@name " must not be read as an active query.
            expect(detectMentionQuery('@asdad' + NBSP)).toBeUndefined();
            expect(detectMentionQuery('<p>@asdad' + NBSP + 'hello</p>')).toBeUndefined();
        });

        it('still tracks a single token being typed', () => {
            expect(detectMentionQuery('<p>@asd</p>')).toBe('asd');
        });

        it('a second, fresh mention after a completed one is active', () => {
            expect(detectMentionQuery('<p>@asdad hello @bo</p>')).toBe('bo');
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

describe('replaceActiveMention', () => {
    it('replaces the @query inline in block-wrapped HTML (no new line)', () => {
        // Regression: previously produced "<html><p>@a</p></html>@audrey" which
        // re-parsed to "@a\n@audrey".
        expect(replaceActiveMention('<html><p>@a</p></html>', 'audrey')).toBe('<html><p>@audrey' + NBSP + '</p></html>');
        expect(replaceActiveMention('<p>@a</p>', 'audrey')).toBe('<p>@audrey' + NBSP + '</p>');
    });

    it('replaces the @query in plain text', () => {
        expect(replaceActiveMention('@a', 'audrey')).toBe('@audrey' + NBSP);
        expect(replaceActiveMention('hello @bo', 'Bob Smith')).toBe('hello @Bob Smith' + NBSP);
    });

    it('keeps text before the mention intact', () => {
        expect(replaceActiveMention('<p>great point @al</p>', 'Alice')).toBe('<p>great point @Alice' + NBSP + '</p>');
    });

    it('handles a bare @ (empty query)', () => {
        expect(replaceActiveMention('<html><p>hi @</p></html>', 'x')).toBe('<html><p>hi @x' + NBSP + '</p></html>');
    });

    it('escapes HTML-significant characters in the label', () => {
        expect(replaceActiveMention('<p>@a</p>', 'a<b>&c')).toBe('<p>@a&lt;b&gt;&amp;c' + NBSP + '</p>');
    });

    it('ends with a non-breaking space so the next keystroke does not re-trigger', () => {
        const result = replaceActiveMention('<p>@as</p>', 'asdad');
        expect(result).toBe('<p>@asdad' + NBSP + '</p>');
        // detection on the committed value must be inactive
        expect(detectMentionQuery(result)).toBeUndefined();
    });
});

describe('htmlToPlainText', () => {
    it('strips tags and decodes entities', () => {
        expect(htmlToPlainText('<p>a &amp; b</p>')).toBe('a & b\n');
        expect(htmlToPlainText('')).toBe('');
    });
});
