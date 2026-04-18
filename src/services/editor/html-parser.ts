/**
 * State-machine HTML parser for the WYSIWYG editor.
 *
 * Parses a limited subset of HTML into an EditorDocument.
 * Handles: p, br, div, strong, b, em, i, u, s, del, strike, code, img.
 * Unknown tags are treated as transparent wrappers (content preserved, tag stripped).
 *
 * Known limitation: editing server-generated HTML containing unsupported formatting
 * (links, blockquotes, lists) will strip those tags but preserve text content.
 */

import {EditorDocument, TextSpan, INLINE_IMAGE_PLACEHOLDER, emptyDocument} from './types';

// HTML entity map
const ENTITY_MAP: Record<string, string> = {
    'amp': '&',
    'lt': '<',
    'gt': '>',
    'quot': '"',
    'apos': "'",
    '#39': "'",
    'nbsp': '\u00A0',
};

function decodeEntity(entity: string): string {
    // Named entity
    if (ENTITY_MAP[entity]) {
        return ENTITY_MAP[entity];
    }
    // Numeric decimal &#NNN;
    if (entity.startsWith('#') && !entity.startsWith('#x')) {
        const code = parseInt(entity.substring(1), 10);
        if (!isNaN(code)) return String.fromCodePoint(code);
    }
    // Numeric hex &#xHHH;
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
        const code = parseInt(entity.substring(2), 16);
        if (!isNaN(code)) return String.fromCodePoint(code);
    }
    // Unknown entity — return as-is with & and ;
    return '&' + entity + ';';
}

function decodeEntities(text: string): string {
    return text.replace(/&([a-zA-Z0-9#]+);/g, (_, entity) => decodeEntity(entity));
}

interface FormatFlags {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    code: boolean;
}

const BOLD_TAGS = new Set(['strong', 'b']);
const ITALIC_TAGS = new Set(['em', 'i']);
const UNDERLINE_TAGS = new Set(['u']);
const STRIKE_TAGS = new Set(['s', 'del', 'strike']);
const CODE_TAGS = new Set(['code']);
const BLOCK_TAGS = new Set(['p', 'div', 'br', 'hr']);

function getTagName(tag: string): string {
    // Extract tag name from "<tag ...>" or "</tag>"
    const match = tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
    return match ? match[1].toLowerCase() : '';
}

function isClosingTag(tag: string): boolean {
    return tag.startsWith('</');
}

const VOID_TAGS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

function isSelfClosing(tag: string): boolean {
    return tag.endsWith('/>') || VOID_TAGS.has(getTagName(tag));
}

function getImgSrc(tag: string): string | null {
    const match = tag.match(/src\s*=\s*["']([^"']+)["']/i);
    return match ? match[1] : null;
}

/**
 * Detect markdown **bold** patterns in text and convert to spans.
 * Used for the **@username** reply mention case.
 */
function parseMarkdownBold(text: string): TextSpan[] {
    const spans: TextSpan[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**')) {
            spans.push({text: part.slice(2, -2), bold: true});
        } else if (part.length > 0) {
            spans.push({text: part});
        }
    }
    return spans.length > 0 ? spans : [{text}];
}

/**
 * Parse HTML string into an EditorDocument.
 */
export function parseHtml(html: string): EditorDocument {
    if (!html || html.trim() === '' || html.trim() === '<p></p>') {
        return emptyDocument();
    }

    // If input has no HTML tags, treat as plain text (possibly with markdown bold)
    if (!html.includes('<')) {
        const spans = parseMarkdownBold(html);
        return {spans, images: [], inlineImages: new Map()};
    }

    const spans: TextSpan[] = [];
    const images: string[] = [];
    const inlineImages = new Map<number, string>();
    const formatStack: FormatFlags[] = [];
    let needsParagraphBreak = false;
    let isFirstBlock = true;

    function currentFormat(): FormatFlags {
        const fmt: FormatFlags = {bold: false, italic: false, underline: false, strikethrough: false, code: false};
        for (const f of formatStack) {
            if (f.bold) fmt.bold = true;
            if (f.italic) fmt.italic = true;
            if (f.underline) fmt.underline = true;
            if (f.strikethrough) fmt.strikethrough = true;
            if (f.code) fmt.code = true;
        }
        return fmt;
    }

    function addText(text: string) {
        if (text.length === 0) return;
        if (needsParagraphBreak) {
            spans.push({text: '\n'});
            needsParagraphBreak = false;
        }
        const fmt = currentFormat();
        spans.push({
            text,
            bold: fmt.bold || undefined,
            italic: fmt.italic || undefined,
            underline: fmt.underline || undefined,
            strikethrough: fmt.strikethrough || undefined,
            code: fmt.code || undefined,
        });
    }

    function addParagraphBreak() {
        if (!isFirstBlock && spans.length > 0) {
            needsParagraphBreak = true;
        }
        isFirstBlock = false;
    }

    // Tokenize and process
    let i = 0;
    while (i < html.length) {
        if (html[i] === '<') {
            // Find the end of the tag
            const tagEnd = html.indexOf('>', i);
            if (tagEnd === -1) {
                // Malformed — treat rest as text
                addText(decodeEntities(html.substring(i)));
                break;
            }
            const tag = html.substring(i, tagEnd + 1);
            const tagName = getTagName(tag);
            i = tagEnd + 1;

            if (tagName === 'img') {
                const src = getImgSrc(tag);
                if (src) {
                    // Determine if this is an inline image (emoticon) or block image.
                    // Heuristic: if we're inside text content in the current paragraph, treat as inline.
                    // Otherwise (at top level, or right after a paragraph break), treat as block.
                    const hasTextInCurrentParagraph = spans.length > 0 &&
                        spans[spans.length - 1].text.length > 0 &&
                        spans[spans.length - 1].text !== '\n' &&
                        !needsParagraphBreak;
                    if (hasTextInCurrentParagraph) {
                        const plainTextOffset = spans.reduce((acc, s) => acc + s.text.length, 0);
                        inlineImages.set(plainTextOffset, src);
                        addText(INLINE_IMAGE_PLACEHOLDER);
                    } else {
                        images.push(src);
                    }
                }
            } else if (tagName === 'br') {
                addText('\n');
            } else if (isClosingTag(tag)) {
                if (tagName === 'p' || tagName === 'div') {
                    addParagraphBreak();
                }
                // Pop format stack for formatting tags
                if (BOLD_TAGS.has(tagName) || ITALIC_TAGS.has(tagName) ||
                    UNDERLINE_TAGS.has(tagName) || STRIKE_TAGS.has(tagName) ||
                    CODE_TAGS.has(tagName)) {
                    // Pop the last matching format entry
                    for (let j = formatStack.length - 1; j >= 0; j--) {
                        const f = formatStack[j];
                        const shouldPop = (
                            (BOLD_TAGS.has(tagName) && f.bold) ||
                            (ITALIC_TAGS.has(tagName) && f.italic) ||
                            (UNDERLINE_TAGS.has(tagName) && f.underline) ||
                            (STRIKE_TAGS.has(tagName) && f.strikethrough) ||
                            (CODE_TAGS.has(tagName) && f.code)
                        );
                        if (shouldPop) {
                            formatStack.splice(j, 1);
                            break;
                        }
                    }
                }
            } else if (!isSelfClosing(tag)) {
                // Opening tag
                if (tagName === 'p' || tagName === 'div') {
                    addParagraphBreak();
                }
                if (BOLD_TAGS.has(tagName)) {
                    formatStack.push({bold: true, italic: false, underline: false, strikethrough: false, code: false});
                } else if (ITALIC_TAGS.has(tagName)) {
                    formatStack.push({bold: false, italic: true, underline: false, strikethrough: false, code: false});
                } else if (UNDERLINE_TAGS.has(tagName)) {
                    formatStack.push({bold: false, italic: false, underline: true, strikethrough: false, code: false});
                } else if (STRIKE_TAGS.has(tagName)) {
                    formatStack.push({bold: false, italic: false, underline: false, strikethrough: true, code: false});
                } else if (CODE_TAGS.has(tagName)) {
                    formatStack.push({bold: false, italic: false, underline: false, strikethrough: false, code: true});
                }
                // Unknown tags: no stack entry, content flows through
            }
        } else {
            // Text content — find the next tag or end
            const nextTag = html.indexOf('<', i);
            const textEnd = nextTag === -1 ? html.length : nextTag;
            const rawText = html.substring(i, textEnd);
            const decoded = decodeEntities(rawText);
            if (decoded.trim().length > 0 || decoded.includes(' ')) {
                addText(decoded);
            }
            i = textEnd;
        }
    }

    if (spans.length === 0) {
        return {spans: [{text: ''}], images, inlineImages};
    }

    return {spans, images, inlineImages};
}
