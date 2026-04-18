import { IFastCommentsStyles, RNComment } from '../types';
import { Text, TouchableOpacity } from 'react-native';
import type { FastCommentsStore } from '../store/types';

export interface ShowNewChildLiveCommentsButtonProps {
    comment: RNComment;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    store: FastCommentsStore;
}

function showHiddenChildComments(store: FastCommentsStore, comment: RNComment) {
    const state = store.getState();

    const toReveal: string[] = [];
    const stack = [comment._id];
    while (stack.length > 0) {
        const id = stack.pop()!;
        const children = state.childrenByParent[id];
        if (!children) continue;
        for (const childId of children) {
            const child = state.byId[childId];
            if (child?.hidden) toReveal.push(childId);
            stack.push(childId);
        }
    }
    for (const id of toReveal) state.mergeCommentFields(id, { hidden: false });
    state.setHiddenChildrenCount(comment._id, 0);
}

export function ShowNewChildLiveCommentsButton({
    comment,
    translations,
    styles,
    store,
}: ShowNewChildLiveCommentsButtonProps) {
    const hiddenChildrenCount = comment.hiddenChildrenCount;
    return (
        <TouchableOpacity
            style={styles.showNewLiveComments?.button}
            onPress={() => showHiddenChildComments(store, comment)}
        >
            <Text style={styles.showNewLiveComments?.count}>
                {Number(hiddenChildrenCount).toLocaleString()}
            </Text>
            <Text style={styles.showNewLiveComments?.text}>
                {hiddenChildrenCount! > 1
                    ? translations.NEW_COMMENTS_CLICK_SHOW
                    : translations.NEW_COMMENT_CLICK_SHOW}
            </Text>
        </TouchableOpacity>
    );
}
