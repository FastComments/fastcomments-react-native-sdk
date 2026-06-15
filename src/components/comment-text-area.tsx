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
import { GifBrowser } from './gif-browser';
import { MentionPopup, MentionPopupHandle } from './mention-popup';
import { MentionPortal } from './mention-portal';
import { MentionUser } from '../services/mentions';
import { detectMentionQuery, htmlToPlainText, replaceActiveMention } from '../services/mention-detection';
import { measureAnchorRect, useAnchoredPosition } from '../services/web-anchor';

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
    const [showGifBrowser, setShowGifBrowser] = useState(false);
    const gifButtonRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null);
    const storeConfig = useStoreValue(store, (s) => s.config);

    // Anchor the GIF popover under its toolbar button. On web the popover is
    // portaled to document.body (the virtualized list clips/overpaints inline
    // overlays), so position it with page coordinates measured off the button.
    const gifPopoverStyle = useAnchoredPosition(showGifBrowser, ({ scrollX, scrollY }) => {
        const rect = measureAnchorRect(gifButtonRef);
        if (!rect) return null;
        const viewportWidth = document.documentElement.clientWidth;
        const panelWidth = 340;
        const left = Math.max(8, Math.min(rect.left, viewportWidth - panelWidth - 8));
        return {
            position: 'absolute',
            top: rect.bottom + scrollY + 4,
            left: left + scrollX,
            zIndex: 2147483000,
        };
    });
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

    // The web editor's schema has no image node: setImage is a stub and <img>
    // in setValue gets stripped. On web, images/GIFs attach as a preview strip
    // and are appended to the comment HTML at read time instead.
    const supportsInlineImages = Platform.OS !== 'web';
    const [pendingImages, setPendingImages] = useState<string[]>([]);

    const insertImage = (src: string) => {
        if (supportsInlineImages) {
            editorRef.current?.setImage(src, 0, 0);
        } else {
            setPendingImages((prev) => [...prev, src]);
        }
    };

    useEffect(() => {
        if (value !== undefined && value !== htmlRef.current) {
            let editorValue = value;
            if (!supportsInlineImages && editorValue) {
                // Editing on web: the raw comment source carries [img]src[/img]
                // tokens; pull them out as attachment chips before the text hits
                // the editor (whose schema has no image support).
                const images: string[] = [];
                editorValue = editorValue.replace(/\[img\]([^[\]]+)\[\/img\]/g, (_match, src: string) => {
                    images.push(src);
                    return '';
                });
                setPendingImages(images);
            } else if (!value) {
                setPendingImages([]);
            }
            htmlRef.current = editorValue;
            editorRef.current?.setValue(editorValue);
            setMentionQuery(detectMentionQuery(editorValue));
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
    // Web-attached images append as [img] tokens, the wire format directly.
    // Assigned in a commit-phase effect (not during render) and reading current
    // values from refs, so it stays correct under concurrent rendering.
    const pendingImagesRef = useRef<string[]>(pendingImages);
    useEffect(() => {
        pendingImagesRef.current = pendingImages;
    }, [pendingImages]);
    useEffect(() => {
        output.getValue = () =>
            htmlRef.current + pendingImagesRef.current.map((src) => `[img]${src}[/img]`).join('');
    }, [output]);

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

    // Web fallback when the host provides no pickImage: a DOM file input, like
    // the web widget's default image-upload button.
    const pickWebFile = (): Promise<File | null> =>
        new Promise((resolve) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
            // No reliable cancel event exists for file inputs; resolving on the
            // next pick is enough since the promise result is only used once.
            input.click();
        });

    const handleImageUpload = async () => {
        try {
            const photoData = pickImage
                ? await pickImage()
                : Platform.OS === 'web' && typeof document !== 'undefined'
                    ? await pickWebFile()
                    : null;
            if (!photoData) return;
            if (typeof photoData === 'string' && photoData.startsWith('http')) {
                insertImage(photoData);
                return;
            }
            setImageUploadProgress(0);
            const formData = new FormData();
            // File only exists in browser runtimes.
            if (typeof File !== 'undefined' && photoData instanceof File) {
                formData.append('file', photoData);
            } else {
                formData.append('file', photoData as string);
            }
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
            insertImage(url);
        } catch (err) {
            console.error('Image upload failed:', err);
            setImageUploadProgress(null);
        }
    };

    const handleGIFPick = async () => {
        // Hosts can supply their own picker; the SDK's GifBrowser is the default.
        if (!pickGIF) {
            setShowGifBrowser(true);
            return;
        }
        try {
            const url = await pickGIF();
            if (url) insertImage(url);
        } catch (err) {
            console.error('GIF pick failed:', err);
        }
    };

    if (emoticonBarConfig) {
        emoticonBarConfig.addEmoticon = (src: string) => {
            insertImage(src);
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
                {/* Web falls back to a DOM file input; native needs a host
                    pickImage callback since the SDK ships no file picker. */}
                {buttons.image && (pickImage || Platform.OS === 'web') && (
                    <TouchableOpacity
                        testID="toolbarImageButton"
                        accessibilityLabel="toolbarImageButton"
                        style={toolbarButtonStyle}
                        onPress={handleImageUpload}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE : FastCommentsImageAsset.ICON_IMAGE_UPLOAD]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
                {buttons.gif && (
                    <TouchableOpacity
                        ref={gifButtonRef}
                        testID="toolbarGifButton"
                        accessibilityLabel="toolbarGifButton"
                        style={toolbarButtonStyle}
                        onPress={handleGIFPick}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={imageAssets[FastCommentsImageAsset.ICON_GIF]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {pendingImages.length > 0 && (
                <ScrollView horizontal style={styles.commentTextArea?.pendingImagesStrip}>
                    {pendingImages.map((src, index) => (
                        <View key={src + index} style={styles.commentTextArea?.pendingImage}>
                            <Image
                                testID={`pendingImage-${index}`}
                                accessibilityLabel={`pendingImage-${index}`}
                                source={{ uri: src }}
                                style={styles.commentTextArea?.pendingImageThumb}
                            />
                            <TouchableOpacity
                                testID={`pendingImageRemove-${index}`}
                                accessibilityLabel={`pendingImageRemove-${index}`}
                                style={styles.commentTextArea?.pendingImageRemove}
                                onPress={() => setPendingImages((prev) => prev.filter((_, i) => i !== index))}
                            >
                                <Text style={styles.commentTextArea?.pendingImageRemoveText}>{'×'}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            )}

            {showGifBrowser && (
                <MentionPortal>
                    <View
                        style={[
                            Platform.OS === 'web'
                                ? (gifPopoverStyle ?? { position: 'absolute', top: 0, left: 0, opacity: 0 })
                                : { position: 'absolute', top: '100%', left: 0, zIndex: 1000 },
                            styles.gifBrowser?.popover,
                        ]}
                    >
                        <GifBrowser
                            store={store}
                            styles={styles}
                            config={storeConfig}
                            imageAssets={imageAssets}
                            cancelled={() => setShowGifBrowser(false)}
                            pickedGIF={(gifPath) => {
                                setShowGifBrowser(false);
                                insertImage(gifPath);
                            }}
                        />
                    </View>
                </MentionPortal>
            )}

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
