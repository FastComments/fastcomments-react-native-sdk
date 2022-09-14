// @ts-ignore TODO remove
import * as React from 'react';

import {Text, View} from "react-native";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export function CommentAreaMessage({message, styles}: {message: string | undefined, styles: IFastCommentsStyles}) {
    return <View style={styles.commentAreaMessage?.wrapper}>
        <View style={styles.commentAreaMessage?.message}>
            <Text style={styles.commentAreaMessage?.messageText}>{message}</Text>
        </View>
    </View>;
}

