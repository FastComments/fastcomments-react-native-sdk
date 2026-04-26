import { useCallback, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { IFastCommentsStyles, FastCommentsCallbacks } from '../types';
import type {
    CreateFeedPostParams,
    FeedPostMediaItem,
} from '../types/feed-post';
import {
    FeedPostMediaAttach,
    type AttachedMediaPending,
} from './feed-post-media-attach';
import type { FastCommentsStore } from '../store/types';
import { uploadFeedMediaItem } from '../services/feed';

export interface FeedPostComposerProps extends Pick<FastCommentsCallbacks, 'pickImage'> {
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    submit: (params: CreateFeedPostParams) => Promise<void>;
    /** Required to perform per-item uploads. Optional so existing tests that don't attach media still mount. */
    store?: FastCommentsStore;
}

const MAX_ITEMS = 10;

function nextKey(): string {
    return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function FeedPostComposer({
    translations,
    styles,
    submit,
    pickImage,
    store,
}: FeedPostComposerProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [busy, setBusy] = useState(false);
    const [attached, setAttached] = useState<AttachedMediaPending[]>([]);
    const [uploadError, setUploadError] = useState<string | undefined>(undefined);

    const canSubmit = !busy && (content.trim().length > 0 || attached.length > 0);

    const onPick = useCallback(async () => {
        if (!pickImage || busy) return;
        if (attached.length >= MAX_ITEMS) return;
        try {
            const photoData = await pickImage();
            if (!photoData) return;
            if (typeof photoData === 'string') {
                if (photoData.startsWith('http')) {
                    setAttached((prev) => [
                        ...prev,
                        {
                            key: nextKey(),
                            previewUri: photoData,
                            remoteItem: {
                                sizes: [{ src: photoData, w: 400, h: 300 }],
                            },
                        },
                    ]);
                } else {
                    setAttached((prev) => [
                        ...prev,
                        { key: nextKey(), previewUri: photoData, sourceForUpload: photoData },
                    ]);
                }
                return;
            }
            const uri = photoData.uri || photoData.base64;
            if (!uri) return;
            setAttached((prev) => [
                ...prev,
                { key: nextKey(), previewUri: uri, sourceForUpload: uri },
            ]);
        } catch (e) {
            // Picker errors are user-visible only via the error string below.
            setUploadError(translations.FEED_MEDIA_UPLOAD_FAILED);
        }
    }, [attached.length, busy, pickImage, translations.FEED_MEDIA_UPLOAD_FAILED]);

    const onRemove = useCallback((key: string) => {
        setAttached((prev) => prev.filter((m) => m.key !== key));
    }, []);

    const onSubmit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        setUploadError(undefined);
        try {
            const uploadedMedia: FeedPostMediaItem[] = [];
            if (attached.length > 0) {
                if (!store) {
                    setUploadError(translations.FEED_MEDIA_UPLOAD_FAILED);
                    return;
                }
                for (const item of attached) {
                    if (item.remoteItem) {
                        uploadedMedia.push(item.remoteItem);
                        continue;
                    }
                    if (!item.sourceForUpload) continue;
                    setAttached((prev) =>
                        prev.map((m) => (m.key === item.key ? { ...m, progress: 0 } : m))
                    );
                    const result = await uploadFeedMediaItem(
                        store,
                        item.sourceForUpload,
                        (loaded, total) => {
                            const ratio = total > 0 ? loaded / total : 0;
                            setAttached((prev) =>
                                prev.map((m) =>
                                    m.key === item.key ? { ...m, progress: ratio } : m
                                )
                            );
                        }
                    );
                    if ('error' in result) {
                        setAttached((prev) =>
                            prev.map((m) =>
                                m.key === item.key
                                    ? { ...m, progress: undefined, errorKey: 'FEED_MEDIA_UPLOAD_FAILED' }
                                    : m
                            )
                        );
                        setUploadError(translations.FEED_MEDIA_UPLOAD_FAILED);
                        return;
                    }
                    uploadedMedia.push(result.item);
                }
            }
            const params: CreateFeedPostParams = {
                title: title.trim() ? title.trim() : undefined,
                contentHTML: content.trim() ? '<p>' + content.trim() + '</p>' : undefined,
                media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
            };
            await submit(params);
            setTitle('');
            setContent('');
            setAttached([]);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.feed?.composer}>
            <TextInput
                testID="postTitleEditText"
                accessibilityLabel="postTitleEditText"
                style={styles.feed?.composerInputTitle}
                placeholder={translations.FEED_COMPOSER_TITLE_PLACEHOLDER}
                value={title}
                onChangeText={setTitle}
                editable={!busy}
            />
            <TextInput
                testID="postContentEditText"
                accessibilityLabel="postContentEditText"
                style={styles.feed?.composerInput}
                placeholder={translations.FEED_COMPOSER_CONTENT_PLACEHOLDER}
                value={content}
                onChangeText={setContent}
                multiline
                editable={!busy}
            />
            {uploadError && (
                <Text
                    testID="feedComposerMediaError"
                    accessibilityLabel="feedComposerMediaError"
                    style={styles.feed?.composerMediaPreviewError}
                >
                    {uploadError}
                </Text>
            )}
            {pickImage && (
                <FeedPostMediaAttach
                    translations={translations}
                    styles={styles}
                    items={attached}
                    disabled={busy}
                    onPick={onPick}
                    onRemove={onRemove}
                />
            )}
            <TouchableOpacity
                testID="submitPostButton"
                accessibilityLabel="submitPostButton"
                style={[
                    styles.feed?.composerSubmit,
                    !canSubmit ? styles.feed?.composerSubmitDisabled : null,
                ]}
                onPress={onSubmit}
            >
                <Text style={styles.feed?.composerSubmitText}>{translations.FEED_SUBMIT_POST}</Text>
            </TouchableOpacity>
        </View>
    );
}
