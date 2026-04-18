/**
 * HTML serializer for the WYSIWYG editor.
 *
 * Converts an EditorDocument back to HTML.
 */

import {EditorDocument, TextSpan, INLINE_IMAGE_PLACEHOLDER, mergeAdjacentSpans} from './types';

function encodeHtmlText(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function wrapSpan(text: string, span: TextSpan): string {
    let result = text;
    if (span.code) result = `<code>${result}</code>`;
    if (span.strikethrough) result = `<s>${result}</s>`;
    if (span.underline) result = `<u>${result}</u>`;
    if (span.italic) result = `<em>${result}</em>`;
    if (span.bold) result = `<strong>${result}</strong>`;
    return result;
}

/**
 * Serialize an EditorDocument to HTML.
 */
export function toHtml(doc: EditorDocument): string {
    const merged = mergeAdjacentSpans(doc.spans);

    // Split spans into paragraphs by \n
    const paragraphs: TextSpan[][] = [[]];
    let charOffset = 0;

    for (const span of merged) {
        const lines = span.text.split('\n');
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            if (lineIdx > 0) {
                // New paragraph
                charOffset++; // account for the \n character
                paragraphs.push([]);
            }
            const lineText = lines[lineIdx];
            if (lineText.length > 0) {
                // Check for inline images (U+FFFC) in this text
                let segStart = 0;
                for (let ci = 0; ci < lineText.length; ci++) {
                    if (lineText[ci] === INLINE_IMAGE_PLACEHOLDER) {
                        // Emit text before the placeholder
                        if (ci > segStart) {
                            const textBefore = lineText.substring(segStart, ci);
                            paragraphs[paragraphs.length - 1].push({
                                ...span,
                                text: textBefore,
                            });
                        }
                        // Emit the inline image
                        const imgUrl = doc.inlineImages.get(charOffset + ci);
                        if (imgUrl) {
                            // Push a special marker span (we'll handle in serialization)
                            paragraphs[paragraphs.length - 1].push({
                                text: INLINE_IMAGE_PLACEHOLDER,
                                // Carry the URL via a convention: we check inlineImages map during output
                            });
                        }
                        segStart = ci + 1;
                    }
                }
                // Remainder after last placeholder
                if (segStart < lineText.length) {
                    paragraphs[paragraphs.length - 1].push({
                        ...span,
                        text: lineText.substring(segStart),
                    });
                }
                charOffset += lineText.length;
            }
        }
    }

    // Build HTML
    const htmlParts: string[] = [];

    // Re-walk to build a global char offset for inline image lookup
    let globalOffset = 0;
    for (const para of paragraphs) {
        if (para.length === 0) {
            htmlParts.push('<p></p>');
            globalOffset++; // the \n
            continue;
        }

        const paraHtml: string[] = [];
        for (const span of para) {
            if (span.text === INLINE_IMAGE_PLACEHOLDER) {
                // Find the image URL — scan inlineImages for the current offset range
                const imgUrl = doc.inlineImages.get(globalOffset);
                if (imgUrl) {
                    paraHtml.push(`<img src="${encodeHtmlText(imgUrl)}">`);
                }
                globalOffset++;
            } else {
                const encoded = encodeHtmlText(span.text);
                paraHtml.push(wrapSpan(encoded, span));
                globalOffset += span.text.length;
            }
        }
        htmlParts.push(`<p>${paraHtml.join('')}</p>`);
        globalOffset++; // the \n between paragraphs
    }

    // Append block-level images
    for (const src of doc.images) {
        htmlParts.push(`<img src="${encodeHtmlText(src)}">`);
    }

    const result = htmlParts.join('');
    return result || '<p></p>';
}
