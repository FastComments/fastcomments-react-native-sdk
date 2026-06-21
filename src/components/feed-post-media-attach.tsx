import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { FeedPostMediaItem } from '../types/feed-post';

export interface AttachedMediaPending {
    /** Stable key for React rendering. */
    key: string;
    /** Local URI or remote http(s) URL preview source. */
    previewUri: string;
    /** Original picker payload to upload at submit time, or undefined when already remote. */
    sourceForUpload?: string;
    /** Already-resolved remote media (when picker returned an http url). */
    remoteItem?: FeedPostMediaItem;
    /** Per-item upload progress 0..1 while a submit is in flight. */
    progress?: number;
    /** Set when an in-flight upload errored. */
    errorKey?: 'FEED_MEDIA_UPLOAD_FAILED';
}

export interface FeedPostMediaAttachProps {
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    items: AttachedMediaPending[];
    disabled?: boolean;
    /** When provided, renders an attach button. Omit to show a preview-only strip
     *  (the feed composer picks media from the editor toolbar instead). */
    onPick?: () => void;
    onRemove: (key: string) => void;
}

export function FeedPostMediaAttach({
    translations,
    styles,
    items,
    disabled,
    onPick,
    onRemove,
}: FeedPostMediaAttachProps) {
    return (
        <View>
            {items.length > 0 && (
                <ScrollView
                    horizontal
                    style={styles.feed?.composerMediaPreviewStrip}
                    showsHorizontalScrollIndicator={false}
                >
                    {items.map((item, idx) => (
                        <View
                            key={item.key}
                            testID={`feedComposerAttachedMedia-${idx}`}
                            accessibilityLabel={`feedComposerAttachedMedia-${idx}`}
                            style={styles.feed?.composerMediaPreviewItem}
                        >
                            <Image
                                source={{ uri: item.previewUri }}
                                style={styles.feed?.composerMediaPreviewImage}
                            />
                            <TouchableOpacity
                                testID={`feedComposerAttachedMediaRemove-${idx}`}
                                accessibilityLabel={`feedComposerAttachedMediaRemove-${idx}`}
                                style={styles.feed?.composerMediaPreviewRemoveButton}
                                onPress={() => onRemove(item.key)}
                                disabled={disabled}
                            >
                                <Text style={styles.feed?.composerMediaPreviewRemoveText}>
                                    {translations.FEED_MEDIA_REMOVE}
                                </Text>
                            </TouchableOpacity>
                            {item.progress !== undefined && (
                                <View style={styles.feed?.composerMediaPreviewProgress}>
                                    <Text style={styles.feed?.composerMediaPreviewProgressText}>
                                        {Math.round(item.progress * 100)}%
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
            )}
            {onPick && (
                <View style={styles.feed?.composerMediaToolbar}>
                    <TouchableOpacity
                        testID="feedComposerAttachMedia"
                        accessibilityLabel="feedComposerAttachMedia"
                        style={styles.feed?.composerMediaAttachButton}
                        onPress={onPick}
                        disabled={disabled}
                    >
                        <Text style={styles.feed?.composerMediaAttachButtonText}>
                            {translations.FEED_MEDIA_ATTACH}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}
