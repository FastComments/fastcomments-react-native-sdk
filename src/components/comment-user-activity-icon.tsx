// @ts-ignore TODO remove
import * as React from 'react';

import {View} from "react-native";
import {IFastCommentsStyles, UserPresenceState} from "../types";
import {State} from "@hookstate/core";

export interface CommentUserActivityIconProps {
    disableLiveCommenting?: boolean
    userId?: string
    anonUserId?: string
    userPresenceState: State<UserPresenceState>
    styles: IFastCommentsStyles
}

export function CommentUserActivityIcon({disableLiveCommenting, userId, anonUserId, userPresenceState, styles}: CommentUserActivityIconProps) {
    if (disableLiveCommenting) {
        return null;
    }
    const isUserOnline = (userId && userPresenceState.usersOnlineMap[userId!].get()) || (anonUserId && userPresenceState.usersOnlineMap[anonUserId!].get());
    if (isUserOnline) {
        return <View style={styles.commentUserActivityIcon?.online}/>;
    } else {
        return <View style={styles.commentUserActivityIcon?.offline}/>;
    }
}
