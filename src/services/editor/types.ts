/**
 * Pure React Native WYSIWYG editor types.
 */

export interface TextSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
}

/** U+FFFC Object Replacement Character — marks inline image positions in text */
export const INLINE_IMAGE_PLACEHOLDER = '\uFFFC';

export interface EditorDocument {
    /** All text content as a flat span list. \n in text = paragraph break. */
    spans: TextSpan[];
    /** Block-level attached image URLs (photos, GIFs from picker). */
    images: string[];
    /** Map of plain-text character offset -> inline image URL (emoticons). */
    inlineImages: Map<number, string>;
}

export interface FormattingState {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strikethrough: boolean;
    code: boolean;
}

export const EMPTY_FORMATTING: FormattingState = {
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    code: false,
};

export function emptyDocument(): EditorDocument {
    return {
        spans: [{text: ''}],
        images: [],
        inlineImages: new Map(),
    };
}

export function spansToPlainText(spans: TextSpan[]): string {
    return spans.map(s => s.text).join('');
}

export function spansHaveSameFormatting(a: TextSpan, b: TextSpan): boolean {
    return (
        !!a.bold === !!b.bold &&
        !!a.italic === !!b.italic &&
        !!a.underline === !!b.underline &&
        !!a.strikethrough === !!b.strikethrough &&
        !!a.code === !!b.code
    );
}

export function mergeAdjacentSpans(spans: TextSpan[]): TextSpan[] {
    if (spans.length === 0) return [{text: ''}];
    const merged: TextSpan[] = [{...spans[0]}];
    for (let i = 1; i < spans.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = spans[i];
        if (spansHaveSameFormatting(prev, curr)) {
            prev.text += curr.text;
        } else {
            merged.push({...curr});
        }
    }
    // Remove empty spans but keep at least one
    const nonEmpty = merged.filter(s => s.text.length > 0);
    return nonEmpty.length > 0 ? nonEmpty : [{text: ''}];
}

export function formattingFromSpan(span: TextSpan): FormattingState {
    return {
        bold: !!span.bold,
        italic: !!span.italic,
        underline: !!span.underline,
        strikethrough: !!span.strikethrough,
        code: !!span.code,
    };
}
