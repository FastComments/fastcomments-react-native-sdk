import { 
    FastCommentsState, 
    FastCommentsImageAsset, 
    IFastCommentsStyles, 
    FastCommentsCallbacks 
} from "../types";
import { ImmutableObject } from "@hookstate/core";
import { Text, View, ActivityIndicator, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import React, { useEffect, useState } from "react";
import { 
    RichText, 
    Toolbar, 
    useEditorBridge,
    useEditorContent,
    DEFAULT_TOOLBAR_ITEMS
} from '@10play/tentap-editor';

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

export interface CommentTextArea10TapProps extends Pick<FastCommentsCallbacks, 'pickImage' | 'pickGIF'> {
    emoticonBarConfig?: EmoticonBarConfig
    focusObserver?: FocusObserver
    state: ImmutableObject<FastCommentsState>
    styles: IFastCommentsStyles
    output: ValueObserver
    onFocus?: () => void
    value?: string
    toolbarButtons?: ToolbarButtonConfig
}

export function CommentTextArea10Tap({
    emoticonBarConfig,
    focusObserver,
    state,
    styles,
    output,
    onFocus: _onFocus,
    pickImage,
    pickGIF,
    value,
    toolbarButtons,
}: CommentTextArea10TapProps) {
    const maxLength = state.config.maxCommentCharacterLength || 2000;
    const hasDarkBackground = state.config.hasDarkBackground;
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    
    // Default toolbar button configuration - code disabled by default
    const defaultButtons: ToolbarButtonConfig = {
        bold: true,
        italic: true,
        underline: true,
        strikethrough: true,
        code: false, // Disabled by default
        image: true,
        gif: true,
    };
    
    const buttons = { ...defaultButtons, ...toolbarButtons };
    
    const editor = useEditorBridge({
        autofocus: false,
        avoidIosKeyboard: true,
        initialContent: value || '<p></p>',
    });
    
    // Handle focus/blur events
    useEffect(() => {
        // 10tap-editor handles focus/blur internally
        // We'll manage focus state through the editor bridge if needed
        return () => {};
    }, [_onFocus]);

    const content = useEditorContent(editor, { type: 'html' });

    useEffect(() => {
        if (value !== undefined && value !== content) {
            editor.setContent(value);
        }
    }, [value]);

    useEffect(() => {
        if (focusObserver) {
            focusObserver.setFocused = (focused) => {
                if (focused) {
                    editor.focus();
                } else {
                    editor.blur();
                }
            };
        }
    }, [editor, focusObserver]);

    output.getValue = () => {
        return content?.substring(0, maxLength) || '';
    };

    const handleImageUpload = async () => {
        if (!pickImage) return;
        
        try {
            const photoData = await pickImage();
            if (!photoData) return;

            if (typeof photoData === 'string' && photoData.startsWith('http')) {
                editor.setImage(photoData);
            } else {
                setImageUploadProgress(0);
                const formData = new FormData();
                formData.append('file', photoData as string);
                
                const xhr = new XMLHttpRequest();
                xhr.open('POST', state.apiHost + '/upload-image/' + state.config.tenantId);
                
                xhr.upload.onprogress = (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        const progress = progressEvent.loaded / progressEvent.total;
                        setImageUploadProgress(progress);
                    }
                };

                const url = await new Promise<string>((resolve, reject) => {
                    xhr.onload = () => {
                        setImageUploadProgress(null);
                        if (xhr.status === 200) {
                            const url = JSON.parse(xhr.response).url;
                            resolve(url);
                        } else {
                            reject(new Error(xhr.response));
                        }
                    };
                    xhr.onerror = () => {
                        setImageUploadProgress(null);
                        reject(new Error('Upload failed'));
                    };
                    xhr.send(formData);
                });

                editor.setImage(url);
            }
        } catch (error) {
            console.error('Image upload failed:', error);
            setImageUploadProgress(null);
        }
    };

    const handleGIFPick = async () => {
        if (!pickGIF) return;
        
        try {
            const gifUrl = await pickGIF();
            if (gifUrl) {
                editor.setImage(gifUrl);
            }
        } catch (error) {
            console.error('GIF pick failed:', error);
        }
    };

    const customToolbarItems = [...DEFAULT_TOOLBAR_ITEMS];

    if (pickImage) {
        customToolbarItems.push({
            onPress: () => {
                handleImageUpload();
                return () => {};
            },
            disabled: () => false,
            active: () => false,
            image: () => state.imageAssets[
                hasDarkBackground 
                    ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE 
                    : FastCommentsImageAsset.ICON_IMAGE_UPLOAD
            ],
        });
    }

    if (pickGIF) {
        customToolbarItems.push({
            onPress: () => {
                handleGIFPick();
                return () => {};
            },
            disabled: () => false,
            active: () => false,
            image: () => state.imageAssets[
                hasDarkBackground 
                    ? FastCommentsImageAsset.ICON_GIF 
                    : FastCommentsImageAsset.ICON_GIF
            ],
        });
    }

    // Setup emoticon bar config
    if (emoticonBarConfig) {
        emoticonBarConfig.addEmoticon = (src: string) => {
            editor.setImage(src);
        };
    }

    // Common button style for toolbar buttons - using app's existing colors
    const toolbarButtonStyle = {
        backgroundColor: hasDarkBackground ? '#444' : 'white',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: styles.commentTextArea?.textarea?.borderColor || (hasDarkBackground ? '#555' : '#a2a2a2'), // Use app's border color or fallback to consistent grey
        minWidth: 28,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        marginRight: 6,
    };

    return (
        <View style={{ width: '100%', flex: 1 }}>
            <View style={[
                styles.commentTextArea?.textarea,
                { 
                    minHeight: state.config.useSingleLineCommentInput ? 40 : 100,
                    borderRadius: styles.commentTextArea?.textarea?.borderRadius || 11,
                    overflow: 'hidden',
                    paddingHorizontal: 8, // Only horizontal padding
                    paddingVertical: 4, // Minimal vertical padding
                    // backgroundColor will come from styles.commentTextArea?.textarea?.backgroundColor if set, otherwise transparent
                }
            ]}>
                <RichText
                    editor={editor}
                    style={{
                        minHeight: state.config.useSingleLineCommentInput ? 32 : 92, // Adjust for less padding
                        flex: 1,
                        backgroundColor: 'transparent', // Ensure RichText itself is transparent
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

            {/* Custom WYSIWYG Toolbar */}
            <View style={{
                backgroundColor: hasDarkBackground ? '#2c2c2c' : '#f8f8f8',
                paddingHorizontal: 12,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexWrap: 'wrap',
            }}>
                {/* Bold Button */}
                {buttons.bold && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={() => editor.toggleBold()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ 
                            fontWeight: 'bold', 
                            fontSize: 14,
                            color: hasDarkBackground ? '#fff' : '#333'
                        }}>B</Text>
                    </TouchableOpacity>
                )}
                
                {/* Italic Button */}
                {buttons.italic && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={() => editor.toggleItalic()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ 
                            fontStyle: 'italic', 
                            fontSize: 14,
                            color: hasDarkBackground ? '#fff' : '#333'
                        }}>I</Text>
                    </TouchableOpacity>
                )}
                
                {/* Underline Button */}
                {buttons.underline && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={() => editor.toggleUnderline()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ 
                            textDecorationLine: 'underline', 
                            fontSize: 14,
                            color: hasDarkBackground ? '#fff' : '#333'
                        }}>U</Text>
                    </TouchableOpacity>
                )}
                
                {/* Strikethrough Button */}
                {buttons.strikethrough && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={() => editor.toggleStrike()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ 
                            textDecorationLine: 'line-through', 
                            fontSize: 14,
                            color: hasDarkBackground ? '#fff' : '#333'
                        }}>S</Text>
                    </TouchableOpacity>
                )}
                
                {/* Code Button */}
                {buttons.code && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={() => editor.toggleCode()}
                        activeOpacity={0.7}
                    >
                        <Text style={{ 
                            fontFamily: 'monospace', 
                            fontSize: 12,
                            color: hasDarkBackground ? '#fff' : '#333'
                        }}>{"<>"}</Text>
                    </TouchableOpacity>
                )}
                
                {/* Image Button */}
                {buttons.image && pickImage && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={handleImageUpload}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={state.imageAssets[
                                hasDarkBackground 
                                    ? FastCommentsImageAsset.ICON_IMAGE_UPLOAD_WHITE 
                                    : FastCommentsImageAsset.ICON_IMAGE_UPLOAD
                            ]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
                
                {/* GIF Button */}
                {buttons.gif && pickGIF && (
                    <TouchableOpacity
                        style={toolbarButtonStyle}
                        onPress={handleGIFPick}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={state.imageAssets[FastCommentsImageAsset.ICON_GIF]}
                            style={{ width: 16, height: 16 }}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {imageUploadProgress !== null && (
                <View style={styles.commentTextArea?.imageUploadModalCenteredView}>
                    <View style={styles.commentTextArea?.imageUploadModalContent}>
                        <ActivityIndicator 
                            size={styles.commentTextArea?.imageUploadModalProgressSpinnerSize} 
                        />
                        <Text style={styles.commentTextArea?.imageUploadModalProgressText}>
                            {Math.round(imageUploadProgress * 100)}%
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}