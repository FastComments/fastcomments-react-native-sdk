import {IFastCommentsStyles, RNComment} from "../types";
import {Text, TouchableOpacity} from "react-native";
import {State} from "@hookstate/core";
import {iterateCommentsTreeState} from "../services/comment-trees";

export interface ShowNewLiveCommentsButtonProps {
    commentTreeNode: State<RNComment>
    translations: Record<string, string>
    styles: IFastCommentsStyles
}

function showHiddenComments(commentTreeNode: State<RNComment>) {
    iterateCommentsTreeState([commentTreeNode], (comment) => {
        if (comment.hidden.get()) {
            comment.hidden.set(false);
        }
    });
    commentTreeNode.hiddenChildrenCount.set(0);
}

export function ShowNewChildLiveCommentsButton({
    commentTreeNode,
    translations,
    styles
}: ShowNewLiveCommentsButtonProps) {
    const hiddenChildrenCount = commentTreeNode.hiddenChildrenCount.get();
    return <TouchableOpacity style={styles.showNewLiveComments?.button} onPress={() => showHiddenComments(commentTreeNode)}>
        <Text style={styles.showNewLiveComments?.count}>{Number(hiddenChildrenCount).toLocaleString()}</Text>
        <Text style={styles.showNewLiveComments?.text}>{hiddenChildrenCount! > 1 ? translations.NEW_COMMENTS_CLICK_SHOW : translations.NEW_COMMENT_CLICK_SHOW}</Text>
    </TouchableOpacity>;
}
