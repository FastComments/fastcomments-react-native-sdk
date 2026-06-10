/**
 * Convert the enriched editor's block markup to the form the server keeps.
 *
 * The editor (react-native-enriched, native and web) wraps each paragraph in
 * <p> tags, but <p> is not in the server's allowed comment/feed tags: the
 * server strips it from comments (gluing paragraphs together) and entity-escapes
 * it in feed posts (rendering literal "<p>" text). The web comment widget sends
 * <br>-separated content, which the server preserves; emit the same shape.
 */
export function editorHtmlToServerHtml(html: string): string {
    if (!html) return html;
    let result = html.replace(/<\/?html>/g, '');
    result = result.replace(/<\/p>\s*<p[^>]*>/g, '<br>');
    result = result.replace(/<p[^>]*>|<\/p>/g, '');
    return result;
}
