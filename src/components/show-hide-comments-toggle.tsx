import { IFastCommentsStyles } from '../types';
import { Text, TouchableOpacity } from 'react-native';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface ShowHideCommentsToggleProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function ShowHideCommentsToggle({ store, styles }: ShowHideCommentsToggleProps) {
    const commentsVisible = useStoreValue(store, (s) => s.commentsVisible);
    const translations = useStoreValue(store, (s) => s.translations);
    const commentCountOnServer = useStoreValue(store, (s) => s.commentCountOnServer);

    let translation = commentsVisible
        ? translations.HIDE_COMMENTS_BUTTON_TEXT
        : translations.SHOW_COMMENTS_BUTTON_TEXT;
    if (!translation) translation = 'ERROR';
    translation = translation.replace('[count]', Number(commentCountOnServer).toLocaleString());
    return (
        <TouchableOpacity
            style={styles.showHideCommentsToggle?.root}
            onPress={() => store.getState().setCommentsVisible(!commentsVisible)}
        >
            <Text style={styles.showHideCommentsToggle?.text}>{translation}</Text>
        </TouchableOpacity>
    );
}
