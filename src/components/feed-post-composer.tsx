import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { CreateFeedPostParams } from '../types/feed-post';

export interface FeedPostComposerProps {
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    submit: (params: CreateFeedPostParams) => Promise<void>;
}

export function FeedPostComposer({ translations, styles, submit }: FeedPostComposerProps) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [busy, setBusy] = useState(false);

    const canSubmit = !busy && content.trim().length > 0;

    const onSubmit = async () => {
        if (!canSubmit) return;
        setBusy(true);
        try {
            // Wrap content in a <p> like the Android composer does so the row
            // and any web/admin consumer renders it as a paragraph.
            const params: CreateFeedPostParams = {
                title: title.trim() ? title.trim() : undefined,
                contentHTML: '<p>' + content.trim() + '</p>',
            };
            await submit(params);
            setTitle('');
            setContent('');
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
