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
    // Images the native editor embeds (setImage) go over the wire as
    // [img]src[/img] tokens, the same format the web widget submits; the
    // server strips raw <img> tags from user submissions.
    result = result.replace(/<img[^>]*src=(["'])([^"']+)\1[^>]*\/?>/g, '[img]$2[/img]');
    return result;
}

/**
 * Whether the editor content has nothing to submit. An empty editor reports
 * '<p><br></p>' or '<p></p>', never '': posting those stores a blank "<br />"
 * comment. Content that is only an image still counts as non-empty.
 */
export function isEditorHtmlEffectivelyEmpty(html: string): boolean {
    if (!html) return true;
    const serverHtml = editorHtmlToServerHtml(html);
    return serverHtml
        .replace(/<br\s*\/?>/g, '')
        .replace(/&nbsp;/g, '')
        .trim().length === 0;
}
