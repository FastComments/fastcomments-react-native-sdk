import { IFastCommentsStyles } from '../types';
import { Text, TouchableOpacity } from 'react-native';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface ShowNewLiveCommentsButtonProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

function showHiddenComments(store: FastCommentsStore) {
    const state = store.getState();
    for (const id in state.byId) {
        const comment = state.byId[id];
        if (comment.hidden) {
            state.mergeCommentFields(id, { hidden: false });
        }
    }
    state.setNewRootCommentCount(0);
}

export function ShowNewLiveCommentsButton({ store, styles }: ShowNewLiveCommentsButtonProps) {
    const newRootCommentCount = useStoreValue(store, (s) => s.newRootCommentCount);
    const translations = useStoreValue(store, (s) => s.translations);

    return (
        <TouchableOpacity
            style={styles.showNewLiveComments?.button}
            onPress={() => showHiddenComments(store)}
        >
            <Text style={styles.showNewLiveComments?.count}>
                {Number(newRootCommentCount).toLocaleString()}
            </Text>
            <Text style={styles.showNewLiveComments?.text}>
                {newRootCommentCount > 1
                    ? translations.NEW_COMMENTS_CLICK_SHOW
                    : translations.NEW_COMMENT_CLICK_SHOW}
            </Text>
        </TouchableOpacity>
    );
}
