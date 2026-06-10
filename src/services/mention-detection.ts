// Pure helpers for detecting an in-progress `@mention` from the rich-text HTML
// the comment editor emits. Kept dependency-free (no react-native) so they can
// be unit-tested directly and shared across platforms.

// Non-breaking space inserted after a committed mention. A regular trailing
// space collapses in HTML (the editor trims "<p>@name </p>"), which would let
// the user's next keystrokes attach to the name and re-trigger detection. NBSP
// is preserved and still counts as whitespace for the regexes below.
const MENTION_TRAILING_SPACE = '\u00a0';

/**
 * Strip simple HTML tags / decode common entities so we can detect `@...` triggers
 * in rich-text HTML the editor emits. Comment editors typically wrap text in
 * <p>/<div> with breaks; we just need readable text for the trigger regex.
 */
export function htmlToPlainText(html: string): string {
    if (!html) return '';
    const stripped = html
        .replace(/<br\s*\/?>(\n)?/gi, '\n')
        .replace(/<\/(p|div|li)>/gi, '\n')
        .replace(/<[^>]+>/g, '');
    return stripped
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}

/**
 * Returns the active mention query (text after the most recent `@` that starts
 * a token) or undefined when no mention is active. The query is a single token:
 * any whitespace after the `@` ends it.
 */
export function detectMentionQuery(value: string): string | undefined {
    // Block elements (</p>, </div>, </li>) become newlines in plain text, so the
    // editor's value almost always ends in one (`<p>@a</p>` -> "@a\n"). That
    // trailing newline is structural, not typed, but the whitespace guard below
    // would treat it as "the mention ended" - which is why the popup never showed
    // on web/native rich-text. Drop trailing newlines (only) before detecting.
    const text = htmlToPlainText(value).replace(/\n+$/, '');
    const atIdx = text.lastIndexOf('@');
    if (atIdx === -1) return undefined;
    if (atIdx > 0) {
        const prev = text.charAt(atIdx - 1);
        if (!/\s/.test(prev)) return undefined;
    }
    const after = text.substring(atIdx + 1);
    // Any whitespace after the `@` ends the trigger token. This dismisses on a
    // trailing space and - importantly - stops the popup from reactivating when
    // the user keeps typing past a completed mention (we insert mentions as plain
    // "@name " text, so the old `@name` would otherwise keep matching).
    if (/\s/.test(after)) return undefined;
    return after;
}

/**
 * Replace the active `@query` in the editor's value with the committed mention
 * (`@label` + a non-breaking space). Operates on the literal value string so it
 * works for both plain text and the block-wrapped HTML the rich editor emits.
 * The previous end-anchored regex failed on HTML like `<html><p>@a</p></html>`
 * (the `@a` isn't at the end), fell through to appending, and the appended text
 * re-parsed onto a new line ("@a\n@label"). Splicing at the located `@query`
 * keeps the mention inline.
 */
export function replaceActiveMention(value: string, label: string): string {
    const escLabel = label
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const replacement = '@' + escLabel + MENTION_TRAILING_SPACE;
    const query = detectMentionQuery(value);
    const needle = query !== undefined ? '@' + query : '@';
    const lastIdx = value.lastIndexOf(needle);
    if (lastIdx === -1) return value + replacement;
    return value.substring(0, lastIdx) + replacement + value.substring(lastIdx + needle.length);
}
