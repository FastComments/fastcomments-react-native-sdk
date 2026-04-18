/**
 * Text change reconciliation for the WYSIWYG editor.
 *
 * When onChangeText fires, we diff the old plain text against the new plain text
 * using prefix/suffix matching to find the edit region, then apply the edit to
 * the span model.
 */

import {TextSpan, FormattingState, mergeAdjacentSpans, spansToPlainText, INLINE_IMAGE_PLACEHOLDER} from './types';

export interface EditRegion {
    prefixLen: number;
    suffixLen: number;
    deletedStart: number;
    deletedEnd: number;
    insertedText: string;
}

/**
 * Find the edit region by comparing old and new plain text.
 * Uses prefix/suffix matching — does not depend on cursor position.
 */
export function findEditRegion(oldText: string, newText: string): EditRegion {
    let prefixLen = 0;
    const minLen = Math.min(oldText.length, newText.length);

    while (prefixLen < minLen && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
    }

    let suffixLen = 0;
    const maxSuffix = minLen - prefixLen;
    while (
        suffixLen < maxSuffix &&
        oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    return {
        prefixLen,
        suffixLen,
        deletedStart: prefixLen,
        deletedEnd: oldText.length - suffixLen,
        insertedText: newText.slice(prefixLen, newText.length - suffixLen),
    };
}

/**
 * Find which span a plain-text offset falls into.
 * Returns {spanIndex, offsetInSpan}.
 */
export function offsetToSpanPosition(spans: TextSpan[], offset: number): {spanIndex: number; offsetInSpan: number} {
    let accumulated = 0;
    for (let i = 0; i < spans.length; i++) {
        const spanEnd = accumulated + spans[i].text.length;
        if (offset <= spanEnd) {
            return {spanIndex: i, offsetInSpan: offset - accumulated};
        }
        accumulated = spanEnd;
    }
    // Past the end — return end of last span
    const lastIdx = spans.length - 1;
    return {spanIndex: lastIdx, offsetInSpan: spans[lastIdx].text.length};
}

/**
 * Delete a range of characters from the span model.
 * Returns new spans with the range removed.
 */
function deleteRange(spans: TextSpan[], start: number, end: number): TextSpan[] {
    if (start >= end) return spans.map(s => ({...s}));

    const result: TextSpan[] = [];
    let offset = 0;

    for (const span of spans) {
        const spanStart = offset;
        const spanEnd = offset + span.text.length;
        offset = spanEnd;

        if (spanEnd <= start || spanStart >= end) {
            // Span entirely outside deletion range
            result.push({...span});
        } else {
            // Span overlaps with deletion
            const keepBefore = span.text.substring(0, Math.max(0, start - spanStart));
            const keepAfter = span.text.substring(Math.max(0, end - spanStart));

            if (keepBefore.length > 0) {
                result.push({...span, text: keepBefore});
            }
            if (keepAfter.length > 0) {
                result.push({...span, text: keepAfter});
            }
        }
    }

    return result;
}

/**
 * Insert text at a plain-text offset with given formatting.
 * Returns new spans with the text inserted.
 */
function insertText(spans: TextSpan[], offset: number, text: string, formatting: FormattingState): TextSpan[] {
    if (text.length === 0) return spans.map(s => ({...s}));

    const result: TextSpan[] = [];
    let accumulated = 0;
    let inserted = false;

    for (const span of spans) {
        const spanStart = accumulated;
        const spanEnd = accumulated + span.text.length;
        accumulated = spanEnd;

        if (!inserted && offset >= spanStart && offset <= spanEnd) {
            // Insert within this span
            const beforeText = span.text.substring(0, offset - spanStart);
            const afterText = span.text.substring(offset - spanStart);

            if (beforeText.length > 0) {
                result.push({...span, text: beforeText});
            }
            result.push({
                text,
                bold: formatting.bold || undefined,
                italic: formatting.italic || undefined,
                underline: formatting.underline || undefined,
                strikethrough: formatting.strikethrough || undefined,
                code: formatting.code || undefined,
            });
            if (afterText.length > 0) {
                result.push({...span, text: afterText});
            }
            inserted = true;
        } else {
            result.push({...span});
        }
    }

    // If we haven't inserted yet (offset past end), append
    if (!inserted) {
        result.push({
            text,
            bold: formatting.bold || undefined,
            italic: formatting.italic || undefined,
            underline: formatting.underline || undefined,
            strikethrough: formatting.strikethrough || undefined,
            code: formatting.code || undefined,
        });
    }

    return result;
}

/**
 * Apply a text change to the span model.
 * This is the core reconciliation function called on every onChangeText.
 */
export function reconcileTextChange(
    spans: TextSpan[],
    newPlainText: string,
    activeFormatting: FormattingState,
    inlineImages?: Map<number, string>,
): {spans: TextSpan[]; inlineImages: Map<number, string>} {
    const oldPlainText = spansToPlainText(spans);

    if (oldPlainText === newPlainText) {
        return {spans, inlineImages: inlineImages || new Map()};
    }

    const edit = findEditRegion(oldPlainText, newPlainText);

    // Step 1: Delete the removed range
    let newSpans = deleteRange(spans, edit.deletedStart, edit.deletedEnd);

    // Step 2: Insert the new text
    if (edit.insertedText.length > 0) {
        newSpans = insertText(newSpans, edit.deletedStart, edit.insertedText, activeFormatting);
    }

    // Step 3: Merge adjacent spans with same formatting
    newSpans = mergeAdjacentSpans(newSpans);

    // Step 4: Update inline image offsets
    const newInlineImages = new Map<number, string>();
    if (inlineImages) {
        const deletedCount = edit.deletedEnd - edit.deletedStart;
        const insertedCount = edit.insertedText.length;
        const shift = insertedCount - deletedCount;

        for (const [offset, url] of inlineImages) {
            if (offset < edit.deletedStart) {
                // Before the edit — unchanged
                newInlineImages.set(offset, url);
            } else if (offset >= edit.deletedEnd) {
                // After the edit — shifted
                newInlineImages.set(offset + shift, url);
            }
            // Offsets within the deleted range are removed
        }
    }

    return {spans: newSpans, inlineImages: newInlineImages};
}

/**
 * Apply formatting toggle to a selection range.
 * If start === end (cursor), returns null (caller should toggle activeFormatting instead).
 */
export function toggleFormattingOnSelection(
    spans: TextSpan[],
    selStart: number,
    selEnd: number,
    property: keyof FormattingState,
): TextSpan[] | null {
    if (selStart === selEnd) return null;

    // Check if all text in selection already has this property
    let allHaveProperty = true;
    let offset = 0;
    for (const span of spans) {
        const spanStart = offset;
        const spanEnd = offset + span.text.length;
        offset = spanEnd;

        if (spanEnd > selStart && spanStart < selEnd) {
            if (!span[property]) {
                allHaveProperty = false;
                break;
            }
        }
    }

    const newValue = !allHaveProperty;
    const newSpans: TextSpan[] = [];
    offset = 0;

    for (const span of spans) {
        const spanStart = offset;
        const spanEnd = offset + span.text.length;
        offset = spanEnd;

        if (spanEnd <= selStart || spanStart >= selEnd) {
            // Outside selection
            newSpans.push({...span});
            continue;
        }

        // Before selection overlap
        if (spanStart < selStart) {
            newSpans.push({...span, text: span.text.substring(0, selStart - spanStart)});
        }

        // Selected part
        const overlapStart = Math.max(spanStart, selStart);
        const overlapEnd = Math.min(spanEnd, selEnd);
        newSpans.push({
            ...span,
            text: span.text.substring(overlapStart - spanStart, overlapEnd - spanStart),
            [property]: newValue || undefined,
        });

        // After selection overlap
        if (spanEnd > selEnd) {
            newSpans.push({...span, text: span.text.substring(selEnd - spanStart)});
        }
    }

    return mergeAdjacentSpans(newSpans);
}
