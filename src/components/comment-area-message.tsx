import {Text, View} from "react-native";
import {IFastCommentsStyles} from "../types";

export function CommentAreaMessage({message, styles}: {message: string | undefined, styles: IFastCommentsStyles}) {
    return <View style={styles.commentAreaMessage?.wrapper}>
        <View style={styles.commentAreaMessage?.message}>
            <Text style={styles.commentAreaMessage?.messageText}>{message}</Text>
        </View>
    </View>;
}

