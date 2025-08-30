import { 
    FastCommentsState, 
    FastCommentsImageAsset, 
    IFastCommentsStyles, 
    FastCommentsCallbacks 
} from "../types";
import { ImmutableObject } from "@hookstate/core";
import { Text, View, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
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

export interface CommentTextArea10TapProps extends Pick<FastCommentsCallbacks, 'pickImage' | 'pickGIF'> {
    emoticonBarConfig?: EmoticonBarConfig
    focusObserver?: FocusObserver
    state: ImmutableObject<FastCommentsState>
    styles: IFastCommentsStyles
    output: ValueObserver
    onFocus?: () => void
    value?: string
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
}: CommentTextArea10TapProps) {
    const maxLength = state.config.maxCommentCharacterLength || 2000;
    const hasDarkBackground = state.config.hasDarkBackground;
    const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
    
    const editor = useEditorBridge({
        autofocus: false,
        avoidIosKeyboard: true,
        initialContent: value || '',
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

    return (
        <View style={{ width: '100%' }}>
            <View style={[
                styles.commentTextArea?.textarea,
                { minHeight: state.config.useSingleLineCommentInput ? 40 : 100 }
            ]}>
                <RichText
                    editor={editor}
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

            {!state.config.disableToolbar && (
                <Toolbar
                    editor={editor}
                    items={customToolbarItems}
                />
            )}

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