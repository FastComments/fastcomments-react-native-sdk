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
} from "react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// react-quill-new exports a ReactQuill class component. We use `any` for the
// ref because the exported types don't include getEditor() on the instance
// and we only need the ref to reach into Quill.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

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
    strike: boolean
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

// Quill accepts a fixed set of format names. We only whitelist ones we expose
// via the toolbar plus link/image so paste-with-formatting still renders.
const allowedFormats = ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'image'];

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quillRef = useRef<any>(null);
    const [html, setHtml] = useState<string>(value || '');
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    const [active, setActive] = useState<ActiveFormats>({ bold: false, italic: false, underline: false, strike: false, code: false });

    const buttons = { ...defaultToolbarButtons, ...toolbarButtons };

    useEffect(() => {
        if (value !== undefined && value !== html) {
            setHtml(value);
        }
    }, [value]);

    useEffect(() => {
        if (!focusObserver) return;
        focusObserver.setFocused = (focused) => {
            const editor = quillRef.current?.getEditor?.();
            if (!editor) return;
            if (focused) editor.focus();
            else editor.blur();
        };
    }, [focusObserver]);

    output.getValue = () => html.substring(0, maxLength);

    const updateActive = useCallback(() => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const fmts = editor.getFormat();
        setActive({
            bold: !!fmts.bold,
            italic: !!fmts.italic,
            underline: !!fmts.underline,
            strike: !!fmts.strike,
            code: !!fmts.code,
        });
    }, []);

    const toggleFormat = useCallback((name: keyof ActiveFormats) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        editor.focus();
        const current = editor.getFormat();
        editor.format(name, !current[name]);
        updateActive();
    }, [updateActive]);

    const insertImageByUrl = useCallback((url: string) => {
        const editor = quillRef.current?.getEditor?.();
        if (!editor) return;
        const range = editor.getSelection(true) || { index: editor.getLength(), length: 0 };
        editor.insertEmbed(range.index, 'image', url, 'user');
        editor.setSelection(range.index + 1, 0);
    }, []);

    const handleImageUpload = async () => {
        if (!pickImage) return;
        try {
            const photoData = await pickImage();
            if (!photoData) return;
            if (typeof photoData === 'string' && photoData.startsWith('http')) {
                insertImageByUrl(photoData);
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
            insertImageByUrl(url);
        } catch (err) {
            console.error('Image upload failed:', err);
            setImageUploadProgress(null);
        }
    };

    const handleGIFPick = async () => {
        if (!pickGIF) return;
        try {
            const url = await pickGIF();
            if (url) insertImageByUrl(url);
        } catch (err) {
            console.error('GIF pick failed:', err);
        }
    };

    if (emoticonBarConfig) {
        emoticonBarConfig.addEmoticon = (src: string) => {
            insertImageByUrl(src);
        };
    }

    const quillModules = useMemo(() => ({ toolbar: false }), []);

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
                <ReactQuill
                    ref={quillRef}
                    theme="snow"
                    value={html}
                    onChange={(content: string) => {
                        setHtml(content);
                        updateActive();
                    }}
                    onChangeSelection={updateActive}
                    onFocus={onFocus as any}
                    modules={quillModules}
                    formats={allowedFormats}
                    style={{
                        minHeight: useSingleLineCommentInput ? 32 : 92,
                        height: '100%',
                        backgroundColor: 'transparent',
                    }}
                />
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
                        onPress={() => toggleFormat('bold')}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontWeight: 'bold', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>B</Text>
                    </TouchableOpacity>
                )}
                {buttons.italic && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.italic && { backgroundColor: activeBackground }]}
                        onPress={() => toggleFormat('italic')}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontStyle: 'italic', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>I</Text>
                    </TouchableOpacity>
                )}
                {buttons.underline && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.underline && { backgroundColor: activeBackground }]}
                        onPress={() => toggleFormat('underline')}
                        activeOpacity={0.7}
                    >
                        <Text style={{ textDecorationLine: 'underline', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>U</Text>
                    </TouchableOpacity>
                )}
                {buttons.strikethrough && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.strike && { backgroundColor: activeBackground }]}
                        onPress={() => toggleFormat('strike')}
                        activeOpacity={0.7}
                    >
                        <Text style={{ textDecorationLine: 'line-through', fontSize: 14, color: hasDarkBackground ? '#fff' : '#333' }}>S</Text>
                    </TouchableOpacity>
                )}
                {buttons.code && (
                    <TouchableOpacity
                        style={[toolbarButtonStyle, active.code && { backgroundColor: activeBackground }]}
                        onPress={() => toggleFormat('code')}
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
