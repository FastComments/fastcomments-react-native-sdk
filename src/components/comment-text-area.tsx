import {
    FastCommentsImageAsset,
    IFastCommentsStyles,
    FastCommentsCallbacks
} from "../types";
import type { FastCommentsStore } from "../store/types";
import { useStoreValue } from "../store/hooks";
import {
    Text,
    View,
    ActivityIndicator,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    EnrichedTextInput,
    type EnrichedTextInputInstance,
    type OnChangeStateEvent,
} from 'react-native-enriched';
import type { NativeSyntheticEvent } from 'react-native';
import { MentionPopup } from './mention-popup';
import { MentionUser } from '../services/mentions';
import { detectMentionQuery, htmlToPlainText } from '../services/mention-detection';

// Library's own event types follow snake->camelCase with `strikeThrough`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OnChangeHtmlEvent = { value: string };

// react-native-enriched's web build renders tiptap's contenteditable
// (`.ProseMirror`) inside a wrapper (`.eti-editor`) that receives our `style`
// (minHeight/flex). The contenteditable itself only auto-sizes to its content
// (one line), so the lower part of the bordered box is a dead, unclickable div.
// The library ships no CSS to stretch it. Inject a tiny web-only rule once so
// the editor fills its wrapper and the whole box is clickable/typable.
const WEB_EDITOR_STYLE_ID = 'fastcomments-enriched-web-fill';
function ensureWebEditorFillStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(WEB_EDITOR_STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = WEB_EDITOR_STYLE_ID;
    el.textContent =
        '.eti-editor{display:flex;flex-direction:column;}' +
        '.eti-editor>.tiptap,.eti-editor>.ProseMirror{flex:1 1 auto;}';
    document.head.appendChild(el);
}

export interface ValueObserver {
    getValue?: () => string
}

export interface FocusObserver {
    setFocused?: (focused: boolean) => void
}

export interface EmoticonBarConfig {
    emoticons?: Array<[string, React.ReactNode]>
    addEmoticon?: (src: string) => void
}

export interface ToolbarButtonConfig {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    strikethrough?: boolean
    code?: boolean
    image?: boolean
    gif?: boolean
}

export interface CommentTextAreaProps extends Pick<FastCommentsCallbacks, 'pickImage' | 'pickGIF'> {
    emoticonBarConfig?: EmoticonBarConfig
    focusObserver?: FocusObserver
    store: FastCommentsStore
    styles: IFastCommentsStyles
    output: ValueObserver
    onFocus?: () => void
    value?: string
    toolbarButtons?: ToolbarButtonConfig
}

type ActiveFormats = {
    bold: boolean
    italic: boolean
    underline: boolean
    strikethrough: boolean
    code: boolean
};

const defaultToolbarButtons: ToolbarButtonConfig = {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: false,
    image: true,
    gif: true,
};

// Re-exported for any existing importers (the implementations now live in the
// dependency-free `../services/mention-detection` module).
export { detectMentionQuery, htmlToPlainText };

export function CommentTextArea({
    emoticonBarConfig,
    focusObserver,
    store,
    styles,
    output,
    onFocus,
    pickImage,
    pickGIF,
    value,
    toolbarButtons,
}: CommentTextAreaProps) {
    const maxLength = useStoreValue(store, (s) => s.config.maxCommentCharacterLength) || 2000;
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const apiHost = useStoreValue(store, (s) => s.apiHost);
    const tenantId = useStoreValue(store, (s) => s.config.tenantId);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const useSingleLineCommentInput = useStoreValue(store, (s) => !!s.config.useSingleLineCommentInput);

    const editorRef = useRef<EnrichedTextInputInstance>(null);
    const htmlRef = useRef<string>(value || '');
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    const [active, setActive] = useState<ActiveFormats>({ bold: false, italic: false, underline: false, strikethrough: false, code: false });
    const [mentionQuery, setMentionQuery] = useState<string | undefined>(undefined);

    const buttons = { ...defaultToolbarButtons, ...toolbarButtons };

    useEffect(() => {
        if (Platform.OS === 'web') ensureWebEditorFillStyles();
    }, []);

    useEffect(() => {
        if (value !== undefined && value !== htmlRef.current) {
            htmlRef.current = value;
            editorRef.current?.setValue(value);
            setMentionQuery(detectMentionQuery(value));
        }
    }, [value]);

    useEffect(() => {
        if (!focusObserver) return;
        focusObserver.setFocused = (focused) => {
            if (focused) editorRef.current?.focus();
            else editorRef.current?.blur();
        };
    }, [focusObserver]);

    output.getValue = () => htmlRef.current.substring(0, maxLength);

    const onChangeHtml = useCallback((e: NativeSyntheticEvent<OnChangeHtmlEvent>) => {
        const next = e.nativeEvent.value;
        htmlRef.current = next;
        setMentionQuery(detectMentionQuery(next));
    }, []);

    const handleMentionSelect = useCallback((user: MentionUser) => {
        const label = user.displayName || user.name;
        const current = htmlRef.current || '';
        const plain = htmlToPlainText(current);
        const atIdx = plain.lastIndexOf('@');
        // Only safely rewrite when the editor's value is plain text (no HTML
        // markup difference). When the editor has rich HTML, we replace the
        // raw current value with a plain-text-friendly mention insert; the
        // editor will re-render via setValue.
        let nextValue: string;
        if (current === plain) {
            nextValue = current.substring(0, atIdx) + `@${label} `;
        } else {
            nextValue = current.replace(/@[^@<>\n]*$/, `@${label} `);
            if (nextValue === current) {
                // Fallback: append.
                nextValue = current + `@${label} `;
            }
        }
        htmlRef.current = nextValue;
        editorRef.current?.setValue(nextValue);
        setMentionQuery(undefined);
    }, []);

    const onChangeState = useCallback((e: NativeSyntheticEvent<OnChangeStateEvent>) => {
        const s = e.nativeEvent;
        setActive({
            bold: !!s.bold?.isActive,
            italic: !!s.italic?.isActive,
            underline: !!s.underline?.isActive,
            strikethrough: !!s.strikeThrough?.isActive,
            code: !!s.inlineCode?.isActive,
        });
    }, []);

    const handleImageUpload = async () => {
        if (!pickImage) return;
        try {
            const photoData = await pickImage();
            if (!photoData) return;
            if (typeof photoData === 'string' && photoData.startsWith('http')) {
                editorRef.current?.setImage(photoData, 0, 0);
                return;
            }
            setImageUploadProgress(0);
            const formData = new FormData();
            formData.append('file', photoData as string);
            const xhr = new XMLHttpRequest();
            xhr.open('POST', apiHost + '/upload-image/' + tenantId);
            xhr.upload.onprogress = (ev) => {
                if (ev.lengthComputable) setImageUploadProgress(ev.loaded / ev.total);
            };
            const url = await new Promise<string>((resolve, reject) => {
                xhr.onload = () => {
                    setImageUploadProgress(null);
                    if (xhr.status === 200) resolve(JSON.parse(xhr.response).url);
                    else reject(new Error(xhr.response));
                };
                xhr.onerror = () => {
                    setImageUploadProgress(null);
                    reject(new Error('Upload failed'));
                };
                xhr.send(formData);
            });
            editorRef.current?.setImage(url, 0, 0);
        } catch (err) {
            console.error('Image upload failed:', err);
            setImageUploadProgress(null);
        }
    };

    const handleGIFPick = async () => {
        if (!pickGIF) return;
        try {
            const url = await pickGIF();
            if (url) editorRef.current?.setImage(url, 0, 0);
        } catch (err) {
            console.error('GIF pick failed:', err);
        }
    };

    if (emoticonBarConfig) {
        emoticonBarConfig.addEmoticon = (src: string) => {
            editorRef.current?.setImage(src, 0, 0);
        };
    }

    const toolbarButtonStyle = useMemo(() => ({
        backgroundColor: hasDarkBackground ? '#444' : 'white',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: styles.commentTextArea?.textarea?.borderColor || (hasDarkBackground ? '#555' : '#a2a2a2'),
        minWidth: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: 6,
    }), [hasDarkBackground, styles.commentTextArea?.textarea?.borderColor]);

    const activeBackground = hasDarkBackground ? '#666' : '#d8d8d8';

    return (
        <View style={{ width: '100%', flex: 1 }}>
            <View style={[
                styles.commentTextArea?.textarea,
                {
                    minHeight: useSingleLineCommentInput ? 40 : 100,
                    borderRadius: styles.commentTextArea?.textarea?.borderRadius || 11,
                    overflow: 'hidden',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                }
            ]}>
                <EnrichedTextInput
                    ref={editorRef}
                    defaultValue={value || ''}
                    onChangeHtml={onChangeHtml}
                    onChangeState={onChangeState}
                    onFocus={onFocus ? () => onFocus() : undefined}
                    style={{
                        minHeight: useSingleLineCommentInput ? 32 : 92,
                        flex: 1,
                        backgroundColor: 'transparent',
                    }}
                />
            </View>

            <MentionPopup
                store={store}
                styles={styles}
                query={mentionQuery}
                onSelect={handleMentionSelect}
            />

            {emoticonBarConfig?.emoticons && (
                <ScrollView horizontal style={styles.commentTextAreaEmoticonBar?.root}>
                    {emoticonBarConfig.emoticons.map(([src, element], index) => (
                        <TouchableOpacity
                            key={src + index}
                            onPress={() => emoticonBarConfig.addEmoticon?.(src)}
                            style={styles.commentTextAreaEmoticonBar?.button}
                        >
                            {element}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={{
                backgroundColor: hasDarkBackground ? '#2c2c2c' : '#f8f8f8',
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
            }}>
                {buttons.bold && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.bold && { backgroundColor: activeBackground }]}
                        onPress={() => editorRef.current?.toggleBold()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>B</Text>
                    </TouchableOpacity>
                )}
                {buttons.italic && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.italic && { backgroundColor: activeBackground }]}
                        onPress={() => editorRef.current?.toggleItalic()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontStyle: 'italic', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>I</Text>
                    </TouchableOpacity>
                )}
                {buttons.underline && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.underline && { backgroundColor: activeBackground }]}
                        onPress={() => editorRef.current?.toggleUnderline()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ textDecorationLine: 'underline', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>U</Text>
                    </TouchableOpacity>
                )}
                {buttons.strikethrough && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.strikethrough && { backgroundColor: activeBackground }]}
                        onPress={() => editorRef.current?.toggleStrikeThrough()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ textDecorationLine: 'line-through', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>S</Text>
                    </TouchableOpacity>
                )}
                {buttons.code && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.code && { backgroundColor: activeBackground }]}
                        onPress={() => editorRef.current?.toggleInlineCode()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: hasDarkBackground ? '#fff' : '#333' }}>{"<>"}</Text>
                    </TouchableOpacity>
                )}
                {buttons.image && pickImage && (
                    <TouchableOpacity style={toolbarButtonStyle} onPress={handleImageUpload} activeOpacity={0.7}>
                        <Image
                            source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE : FastCommentsImageAsset.ICON_IMAGE_UPLOAD]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
                {buttons.gif && pickGIF && (
                    <TouchableOpacity style={toolbarButtonStyle} onPress={handleGIFPick} activeOpacity={0.7}>
                        <Image
                            source={imageAssets[FastCommentsImageAsset.ICON_GIF]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {imageUploadProgress !== null && (
                <View style={styles.commentTextArea?.imageUploadModalCenteredView}>
                    <View style={styles.commentTextArea?.imageUploadModalContent}>
                        <ActivityIndicator size={styles.commentTextArea?.imageUploadModalProgressSpinnerSize} />
                        <Text style={styles.commentTextArea?.imageUploadModalProgressText}>
                            {Math.round(imageUploadProgress * 100)}%
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
