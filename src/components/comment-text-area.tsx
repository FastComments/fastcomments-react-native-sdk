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
import { MentionPopup, MentionPopupHandle } from './mention-popup';
import { MentionPortal } from './mention-portal';
import { MentionUser } from '../services/mentions';
import { detectMentionQuery, htmlToPlainText, replaceActiveMention } from '../services/mention-detection';

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
    const translations = useStoreValue(store, (s) => s.translations);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const apiHost = useStoreValue(store, (s) => s.apiHost);
    const tenantId = useStoreValue(store, (s) => s.config.tenantId);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const useSingleLineCommentInput = useStoreValue(store, (s) => !!s.config.useSingleLineCommentInput);

    const editorRef = useRef<EnrichedTextInputInstance>(null);
    const htmlRef = useRef<string>(value || '');
    // For keyboard-driving the mention popup (web): the wrapper DOM node we
    // attach a capture-phase keydown listener to, the popup's imperative handle,
    // and a ref mirror of `mentionQuery` so that once-attached listener sees the
    // current open state without re-binding.
    const wrapperRef = useRef<View>(null);
    const editorBoxRef = useRef<View>(null);
    const mentionPopupRef = useRef<MentionPopupHandle>(null);
    const mentionActiveRef = useRef<boolean>(false);
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    const [active, setActive] = useState<ActiveFormats>({ bold: false, italic: false, underline: false, strikethrough: false, code: false });
    const [mentionQuery, setMentionQuery] = useState<string | undefined>(undefined);
    // On web the composer lives inside the scrollable comment list (as its
    // header), so an `absolute` popup gets clipped by the list's overflow and
    // painted under later comment-row cells. Position it `fixed` (measured off
    // the editor box) to escape both. Native keeps the in-flow `absolute` overlay.
    const [mentionOverlayStyle, setMentionOverlayStyle] = useState<Record<string, unknown> | null>(null);
    mentionActiveRef.current = mentionQuery !== undefined;

    const buttons = { ...defaultToolbarButtons, ...toolbarButtons };

    useEffect(() => {
        if (Platform.OS === 'web') ensureWebEditorFillStyles();
    }, []);

    // Web-only: drive the mention popup from the keyboard. react-native-enriched's
    // web editor forwards keydown but always returns false to ProseMirror, so it
    // can't tell PM "handled - don't move the cursor / insert a newline". Instead
    // we listen on the wrapper in the CAPTURE phase: the event is intercepted
    // before it reaches the contenteditable, so stopping it keeps PM from acting.
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        // The tsconfig has no DOM lib (this is an RN project), so we type the web
        // key event minimally rather than relying on the global KeyboardEvent
        // (which resolves to react-native's unrelated KeyboardEvent type).
        type WebKeyEvent = { key: string; preventDefault: () => void; stopPropagation: () => void };
        const node = wrapperRef.current as unknown as {
            addEventListener?: (t: string, h: (e: WebKeyEvent) => void, c?: boolean) => void;
            removeEventListener?: (t: string, h: (e: WebKeyEvent) => void, c?: boolean) => void;
        } | null;
        if (!node || typeof node.addEventListener !== 'function') return;
        const onKeyDown = (e: WebKeyEvent) => {
            if (!mentionActiveRef.current) return;
            const key = e.key;
            if (key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                setMentionQuery(undefined);
                return;
            }
            if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === 'Tab') {
                if (mentionPopupRef.current?.handleKey(key)) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        node.addEventListener('keydown', onKeyDown, true);
        return () => node.removeEventListener?.('keydown', onKeyDown, true);
    }, []);

    // Web-only: keep the fixed-positioned mention popup anchored under the editor
    // box while it's open (reposition on scroll/resize since `fixed` is relative
    // to the viewport).
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        if (mentionQuery === undefined) {
            setMentionOverlayStyle(null);
            return;
        }
        const win = globalThis as unknown as {
            addEventListener?: (t: string, h: () => void, c?: boolean) => void;
            removeEventListener?: (t: string, h: () => void, c?: boolean) => void;
        };
        const reposition = () => {
            const box = editorBoxRef.current as unknown as { getBoundingClientRect?: () => { bottom: number; left: number; width: number } } | null;
            const rect = box?.getBoundingClientRect?.();
            if (!rect) return;
            setMentionOverlayStyle({ position: 'fixed', top: rect.bottom, left: rect.left, width: rect.width, zIndex: 2147483000 });
        };
        reposition();
        win.addEventListener?.('scroll', reposition, true);
        win.addEventListener?.('resize', reposition);
        return () => {
            win.removeEventListener?.('scroll', reposition, true);
            win.removeEventListener?.('resize', reposition);
        };
    }, [mentionQuery]);

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

    // Return the FULL value: silently truncating here lost everything past the
    // limit with no warning. Length is validated (visibly) at submit time.
    output.getValue = () => htmlRef.current;

    const onChangeHtml = useCallback((e: NativeSyntheticEvent<OnChangeHtmlEvent>) => {
        const next = e.nativeEvent.value;
        htmlRef.current = next;
        setMentionQuery(detectMentionQuery(next));
    }, []);

    const handleMentionSelect = useCallback((user: MentionUser) => {
        const label = user.displayName || user.name;
        const nextValue = replaceActiveMention(htmlRef.current || '', label);
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

    const toolbarButtonStyle = styles.commentTextArea?.toolbarFormatButton;
    const toolbarButtonActiveStyle = styles.commentTextArea?.toolbarFormatButtonActive;
    const toolbarButtonTextStyle = styles.commentTextArea?.toolbarFormatButtonText;

    return (
        <View ref={wrapperRef} style={{ width: '100%', flex: 1 }}>
            {/* Relative anchor so that on native the mention popup overlays
                (position:absolute, top:100%) directly under the editor box. On web
                the popup is positioned `fixed` instead (see mentionOverlayStyle) to
                escape the scrollable comment list that clips/stacks over it. */}
            <View style={{ position: 'relative', zIndex: 10 }}>
                <View
                    ref={editorBoxRef}
                    style={[
                        styles.commentTextArea?.textarea,
                        {
                            minHeight: useSingleLineCommentInput ? 40 : 100,
                            borderRadius: styles.commentTextArea?.textarea?.borderRadius || 11,
                            overflow: 'hidden',
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                        }
                    ]}
                >
                    <EnrichedTextInput
                        ref={editorRef}
                        autoFocus={false}
                        defaultValue={value || ''}
                        onChangeHtml={onChangeHtml}
                        onChangeState={onChangeState}
                        onFocus={onFocus ? () => onFocus() : undefined}
                        placeholder={translations.ENTER_COMMENT_HERE}
                        placeholderTextColor={styles.commentTextArea?.placeholder?.color}
                        style={{
                            minHeight: useSingleLineCommentInput ? 32 : 92,
                            flex: 1,
                            backgroundColor: 'transparent',
                            color: styles.commentTextArea?.text?.color,
                            fontSize: styles.commentTextArea?.text?.fontSize,
                        }}
                    />
                </View>

                <MentionPortal>
                    <View
                        style={(
                            Platform.OS === 'web'
                                ? (mentionOverlayStyle || { position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0 })
                                : { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000 }
                        ) as never}
                    >
                        <MentionPopup
                            ref={mentionPopupRef}
                            store={store}
                            styles={styles}
                            query={mentionQuery}
                            onSelect={handleMentionSelect}
                        />
                    </View>
                </MentionPortal>
            </View>

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

            <View style={styles.commentTextArea?.toolbarRoot}>
                {buttons.bold && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.bold && toolbarButtonActiveStyle]}
                        onPress={() => editorRef.current?.toggleBold()}
                        activeOpacity={0.7}
                    >
                        <Text style={[toolbarButtonTextStyle, { fontWeight: 'bold' }]}>B</Text>
                    </TouchableOpacity>
                )}
                {buttons.italic && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.italic && toolbarButtonActiveStyle]}
                        onPress={() => editorRef.current?.toggleItalic()}
                        activeOpacity={0.7}
                    >
                        <Text style={[toolbarButtonTextStyle, { fontStyle: 'italic' }]}>I</Text>
                    </TouchableOpacity>
                )}
                {buttons.underline && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.underline && toolbarButtonActiveStyle]}
                        onPress={() => editorRef.current?.toggleUnderline()}
                        activeOpacity={0.7}
                    >
                        <Text style={[toolbarButtonTextStyle, { textDecorationLine: 'underline' }]}>U</Text>
                    </TouchableOpacity>
                )}
                {buttons.strikethrough && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.strikethrough && toolbarButtonActiveStyle]}
                        onPress={() => editorRef.current?.toggleStrikeThrough()}
                        activeOpacity={0.7}
                    >
                        <Text style={[toolbarButtonTextStyle, { textDecorationLine: 'line-through' }]}>S</Text>
                    </TouchableOpacity>
                )}
                {buttons.code && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.code && toolbarButtonActiveStyle]}
                        onPress={() => editorRef.current?.toggleInlineCode()}
                        activeOpacity={0.7}
                    >
                        <Text style={[toolbarButtonTextStyle, { fontFamily: 'monospace' }]}>{"<>"}</Text>
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
