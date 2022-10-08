import {IFastCommentsStyles, RNComment} from "../types";
import {Text, TouchableOpacity} from "react-native";
import {iterateCommentsTree} from "../services/comment-trees";
import {incChangeCounter} from "../services/comment-render-determination";

export interface ShowNewLiveCommentsButtonProps {
    comment: RNComment
    translations: Record<string, string>
    styles: IFastCommentsStyles
}

function showHiddenComments(comment: RNComment) {
    iterateCommentsTree([comment], (comment) => {
        if (comment.hidden) {
            comment.hidden = false;
            incChangeCounter(comment);
        }
    });
    comment.hiddenChildrenCount = 0;
    incChangeCounter(comment);
}

export function ShowNewChildLiveCommentsButton({
    comment,
    translations,
    styles
}: ShowNewLiveCommentsButtonProps) {
    const hiddenChildrenCount = comment.hiddenChildrenCount;
    return <TouchableOpacity style={styles.showNewLiveComments?.button} onPress={() => showHiddenComments(comment)}>
        <Text style={styles.showNewLiveComments?.count}>{Number(hiddenChildrenCount).toLocaleString()}</Text>
        <Text style={styles.showNewLiveComments?.text}>{hiddenChildrenCount! > 1 ? translations.NEW_COMMENTS_CLICK_SHOW : translations.NEW_COMMENT_CLICK_SHOW}</Text>
    </TouchableOpacity>;
}
