/**
 * Step 0: Proof-of-concept spike for pure RN WYSIWYG editor.
 *
 * This is a throwaway test component. Run it in the example app to validate:
 *   Test 1 - Cursor stays correct when typing inside styled spans
 *   Test 2 - Keyboard doesn't dismiss on rapid typing (Android)
 *   Test 3 - CJK IME composition works
 *   Test 4 - Inline Image inside Text inside TextInput renders
 *   Test 5 - Swipe/predictive keyboard works with prefix/suffix diff
 *
 * Usage: Replace the example app's root component with <EditorSpike />.
 */

import React, {useState, useCallback} from 'react';
import {
    View,
    TextInput,
    Text,
    Image,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
} from 'react-native';

interface TextSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
}

function spansToPlainText(spans: TextSpan[]): string {
    return spans.map(s => s.text).join('');
}

function spanToStyle(span: TextSpan) {
    return {
        fontWeight: span.bold ? 'bold' as const : 'normal' as const,
        fontStyle: span.italic ? 'italic' as const : 'normal' as const,
        fontSize: 16,
        color: '#333',
    };
}

function mergeAdjacentSpans(spans: TextSpan[]): TextSpan[] {
    if (spans.length === 0) return [{text: ''}];
    const merged: TextSpan[] = [spans[0]];
    for (let i = 1; i < spans.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = spans[i];
        if (prev.bold === curr.bold && prev.italic === curr.italic) {
            prev.text += curr.text;
        } else {
            merged.push({...curr});
        }
    }
    return merged.filter(s => s.text.length > 0);
}

/**
 * Find the edit region using prefix/suffix matching.
 */
function findEditRegion(oldText: string, newText: string) {
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
 * Apply a text edit to the span model.
 */
function applyEdit(
    spans: TextSpan[],
    edit: ReturnType<typeof findEditRegion>,
    activeFormatting: {bold: boolean; italic: boolean}
): TextSpan[] {
    const {deletedStart, deletedEnd, insertedText} = edit;
    const newSpans: TextSpan[] = [];
    let offset = 0;

    for (const span of spans) {
        const spanStart = offset;
        const spanEnd = offset + span.text.length;
        offset = spanEnd;

        // Span is entirely before the edit
        if (spanEnd <= deletedStart) {
            newSpans.push({...span});
            continue;
        }

        // Span is entirely after the edit
        if (spanStart >= deletedEnd) {
            // Insert new text before this span (only once, at the edit point)
            if (insertedText && newSpans.length > 0 || spanStart === deletedEnd) {
                // Already handled or will handle below
            }
            newSpans.push({...span});
            continue;
        }

        // Span overlaps with the edit - split it
        // Part before the deletion
        if (spanStart < deletedStart) {
            newSpans.push({
                ...span,
                text: span.text.substring(0, deletedStart - spanStart),
            });
        }

        // Insert new text at the deletion point (only once)
        if (insertedText && spanStart <= deletedStart && spanEnd >= deletedStart) {
            newSpans.push({
                text: insertedText,
                bold: activeFormatting.bold,
                italic: activeFormatting.italic,
            });
        }

        // Part after the deletion
        if (spanEnd > deletedEnd) {
            newSpans.push({
                ...span,
                text: span.text.substring(deletedEnd - spanStart),
            });
        }
    }

    // If edit is at the very end and no span captured the insert
    if (insertedText && deletedStart >= offset) {
        newSpans.push({
            text: insertedText,
            bold: activeFormatting.bold,
            italic: activeFormatting.italic,
        });
    }

    const result = mergeAdjacentSpans(newSpans);
    return result.length > 0 ? result : [{text: ''}];
}

export function EditorSpike() {
    const [spans, setSpans] = useState<TextSpan[]>([
        {text: 'Normal text ', bold: false, italic: false},
        {text: 'bold text', bold: true, italic: false},
        {text: ' and ', bold: false, italic: false},
        {text: 'italic text', bold: false, italic: true},
        {text: ' then normal.', bold: false, italic: false},
    ]);

    const [selection, setSelection] = useState({start: 0, end: 0});
    const [activeBold, setActiveBold] = useState(false);
    const [activeItalic, setActiveItalic] = useState(false);
    const [inlineImageWorks, setInlineImageWorks] = useState<boolean | null>(null);
    const [log, setLog] = useState<string[]>([]);

    const addLog = useCallback((msg: string) => {
        setLog(prev => [...prev.slice(-19), msg]);
    }, []);

    const handleTextChange = useCallback((newText: string) => {
        const oldText = spansToPlainText(spans);
        if (oldText === newText) return;

        const edit = findEditRegion(oldText, newText);
        addLog(`Edit: del[${edit.deletedStart}:${edit.deletedEnd}] ins="${edit.insertedText}"`);

        const newSpans = applyEdit(spans, edit, {bold: activeBold, italic: activeItalic});
        setSpans(newSpans);
    }, [spans, activeBold, activeItalic, addLog]);

    const handleSelectionChange = useCallback((e: any) => {
        const sel = e.nativeEvent.selection;
        setSelection(sel);

        // Update active formatting to match span at cursor
        if (sel.start === sel.end) {
            let offset = 0;
            for (const span of spans) {
                offset += span.text.length;
                if (offset >= sel.start) {
                    setActiveBold(!!span.bold);
                    setActiveItalic(!!span.italic);
                    break;
                }
            }
        }
    }, [spans]);

    const toggleBoldOnSelection = useCallback(() => {
        if (selection.start === selection.end) {
            setActiveBold(b => !b);
            addLog(`Toggle bold (active): ${!activeBold}`);
            return;
        }
        // Apply to selection
        addLog(`Toggle bold on selection [${selection.start}:${selection.end}]`);
        const oldText = spansToPlainText(spans);
        const selStart = selection.start;
        const selEnd = selection.end;

        // Check if all selected text is already bold
        let allBold = true;
        let offset = 0;
        for (const span of spans) {
            const spanStart = offset;
            const spanEnd = offset + span.text.length;
            offset = spanEnd;
            if (spanEnd > selStart && spanStart < selEnd) {
                if (!span.bold) {
                    allBold = false;
                    break;
                }
            }
        }

        const shouldBold = !allBold;
        const newSpans: TextSpan[] = [];
        offset = 0;
        for (const span of spans) {
            const spanStart = offset;
            const spanEnd = offset + span.text.length;
            offset = spanEnd;

            if (spanEnd <= selStart || spanStart >= selEnd) {
                newSpans.push({...span});
                continue;
            }

            // Before selection
            if (spanStart < selStart) {
                newSpans.push({...span, text: span.text.substring(0, selStart - spanStart)});
            }
            // Selected part
            const overlapStart = Math.max(spanStart, selStart);
            const overlapEnd = Math.min(spanEnd, selEnd);
            newSpans.push({
                ...span,
                text: span.text.substring(overlapStart - spanStart, overlapEnd - spanStart),
                bold: shouldBold,
            });
            // After selection
            if (spanEnd > selEnd) {
                newSpans.push({...span, text: span.text.substring(selEnd - spanStart)});
            }
        }
        setSpans(mergeAdjacentSpans(newSpans));
    }, [selection, spans, activeBold, addLog]);

    const plainText = spansToPlainText(spans);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scroll}>
                <Text style={styles.title}>WYSIWYG Editor Spike</Text>
                <Text style={styles.subtitle}>Type in the editor below. Text has pre-set formatting.</Text>

                {/* Toolbar */}
                <View style={styles.toolbar}>
                    <TouchableOpacity
                        style={[styles.toolbarBtn, activeBold && styles.toolbarBtnActive]}
                        onPress={toggleBoldOnSelection}
                    >
                        <Text style={[styles.toolbarBtnText, {fontWeight: 'bold'}]}>B</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolbarBtn, activeItalic && styles.toolbarBtnActive]}
                        onPress={() => setActiveItalic(i => !i)}
                    >
                        <Text style={[styles.toolbarBtnText, {fontStyle: 'italic'}]}>I</Text>
                    </TouchableOpacity>
                </View>

                {/* The core test: TextInput with nested styled Text children */}
                <View style={styles.editorContainer}>
                    <TextInput
                        multiline
                        style={styles.textInput}
                        onChangeText={handleTextChange}
                        onSelectionChange={handleSelectionChange}
                    >
                        {spans.map((span, i) => (
                            <Text key={i} style={spanToStyle(span)}>
                                {span.text}
                            </Text>
                        ))}
                    </TextInput>
                </View>

                {/* Test 4: Inline Image test */}
                <Text style={styles.subtitle}>Test 4: Inline Image in TextInput</Text>
                <View style={styles.editorContainer}>
                    <TextInput multiline style={styles.textInput}>
                        <Text style={{fontSize: 16}}>Text before </Text>
                        <Image
                            source={{uri: 'https://fastcomments.com/images/favicon-32x32.png'}}
                            style={{width: 20, height: 20}}
                        />
                        <Text style={{fontSize: 16}}> text after image</Text>
                    </TextInput>
                </View>
                <View style={styles.toolbar}>
                    <TouchableOpacity
                        style={[styles.toolbarBtn, inlineImageWorks === true && styles.toolbarBtnActive]}
                        onPress={() => setInlineImageWorks(true)}
                    >
                        <Text style={styles.toolbarBtnText}>Image works</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toolbarBtn, inlineImageWorks === false && styles.toolbarBtnActive]}
                        onPress={() => setInlineImageWorks(false)}
                    >
                        <Text style={styles.toolbarBtnText}>Image broken</Text>
                    </TouchableOpacity>
                </View>

                {/* Debug info */}
                <Text style={styles.subtitle}>Debug</Text>
                <Text style={styles.debugText}>Plain text length: {plainText.length}</Text>
                <Text style={styles.debugText}>Span count: {spans.length}</Text>
                <Text style={styles.debugText}>Selection: {selection.start}-{selection.end}</Text>
                <Text style={styles.debugText}>Active: {activeBold ? 'B' : ''}{activeItalic ? 'I' : ''}{!activeBold && !activeItalic ? '(none)' : ''}</Text>
                <Text style={styles.debugText}>Spans: {JSON.stringify(spans.map(s => ({t: s.text, b: s.bold, i: s.italic})))}</Text>

                <Text style={styles.subtitle}>Event Log</Text>
                {log.map((entry, i) => (
                    <Text key={i} style={styles.logEntry}>{entry}</Text>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    scroll: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        color: '#666',
    },
    toolbar: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    toolbarBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        backgroundColor: '#f8f8f8',
    },
    toolbarBtnActive: {
        backgroundColor: '#ddeeff',
        borderColor: '#4488cc',
    },
    toolbarBtnText: {
        fontSize: 14,
        color: '#333',
    },
    editorContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        minHeight: 100,
        padding: 8,
    },
    textInput: {
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    debugText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#666',
        marginBottom: 2,
    },
    logEntry: {
        fontSize: 11,
        fontFamily: 'monospace',
        color: '#888',
        marginBottom: 1,
    },
});
