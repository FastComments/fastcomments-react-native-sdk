// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, View} from "react-native";

export function CommentUserActivityIcon({comment, state}: FastCommentsCommentWithState) {
    if (state.config.disableLiveCommenting.get()) {
        return null;
    }
    const userPresenceState = state.userPresenceState.get();
    const isUserOnline = (comment.userId && userPresenceState.usersOnlineMap[comment.userId.get()!]) || (comment.anonUserId && userPresenceState.usersOnlineMap[comment.anonUserId.get()!]);
    if (isUserOnline) {
        return <View style={styles.online}></View>;
    } else {
        return <View style={styles.offline}></View>;
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
