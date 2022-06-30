import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, ViewStyle} from "react-native";

export function CommentUserActivityIcon(commentState: FastCommentsCommentWithState) {
    const {comment, state} = commentState;
    if (state.config.disableLiveCommenting) {
        return null;
    }
    const userPresenceState = state.userPresenceState;
    const isUserOnline = userPresenceState.usersOnlineMap[comment.userId] === true || userPresenceState.usersOnlineMap[comment.anonUserId] === true;
    if (isUserOnline) {
        return <div style={styles.online} title={state.translations.USER_VIEWING_THREAD}></div>;
    } else {
        return <div style={styles.offline} title={state.translations.USER_OFFLINE_THREAD}></div>;
    }
}

const styles = StyleSheet.create({
    online: {
        "position": "absolute",
        "top": 4,
        "right": 4,
        "borderTopLeftRadius": 10,
        "borderTopRightRadius": 10,
        "borderBottomRightRadius": 10,
        "borderBottomLeftRadius": 10,
    },
    offline: {
        "position": "absolute",
        "top": 4,
        "right": 4,
        "borderTopLeftRadius": 10,
        "borderTopRightRadius": 10,
        "borderBottomRightRadius": 10,
        "borderBottomLeftRadius": 10,
        "backgroundColor": "lime"
    }
});
