// Pure helpers for detecting an in-progress `@mention` from the rich-text HTML
// the comment editor emits. Kept dependency-free (no react-native) so they can
// be unit-tested directly and shared across platforms.

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
 * a token) or undefined when no mention is active. A trailing space terminates
 * the mention.
 */
export function detectMentionQuery(value: string): string | undefined {
    // Block elements (</p>, </div>, </li>) become newlines in plain text, so the
    // editor's value almost always ends in one (`<p>@a</p>` -> "@a\n"). That
    // trailing newline is structural, not typed, but the `\n`-after-@ guard below
    // would treat it as "the mention ended" - which is why the popup never showed
    // on web/native rich-text. Drop trailing newlines (only) before detecting;
    // internal newlines and trailing spaces are preserved so the rules still hold.
    const text = htmlToPlainText(value).replace(/\n+$/, '');
    const atIdx = text.lastIndexOf('@');
    if (atIdx === -1) return undefined;
    if (atIdx > 0) {
        const prev = text.charAt(atIdx - 1);
        if (!/\s/.test(prev)) return undefined;
    }
    const after = text.substring(atIdx + 1);
    if (/\n/.test(after)) return undefined;
    if (after.length > 0 && /\s$/.test(after)) return undefined;
    return after;
}
