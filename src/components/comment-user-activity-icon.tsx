// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {View} from "react-native";

export function CommentUserActivityIcon({comment, state, styles}: FastCommentsCommentWithState) {
    if (state.config.disableLiveCommenting.get()) {
        return null;
    }
    const userPresenceState = state.userPresenceState.get();
    const isUserOnline = (comment.userId && userPresenceState.usersOnlineMap[comment.userId.get()!]) || (comment.anonUserId && userPresenceState.usersOnlineMap[comment.anonUserId.get()!]);
    if (isUserOnline) {
        return <View style={styles.commentUserActivityIcon?.online}></View>;
    } else {
        return <View style={styles.commentUserActivityIcon?.offline}></View>;
    }
}
