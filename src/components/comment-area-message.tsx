// @ts-ignore TODO remove
import * as React from 'react';

import {StyleSheet, Text, View} from "react-native";

export function CommentAreaMessage(message: string | undefined) {
    return <View style={styles.wrapper}>
        <View style={styles.message}>
            {/* TODO: login links etc? */}
            <Text style={styles.messageText}>{message}</Text>
            {/* TODO: Icon */}
        </View>
    </View>;
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        minHeight: '140px',
        padding: '30px 0',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #bfbfbf',
        borderBottomStartRadius: 0,
        borderBottomLeftRadius: 11,
        borderBottomRightRadius: 11,
        borderBottomEndRadius: 11
    },
    message: {
        "animation": "pop-in 0.5s",
        "animationTimingFunction": "ease",
        "paddingTop": 10,
        "paddingRight": 17,
        "paddingBottom": 10,
        "paddingLeft": 27,
        "borderTopLeftRadius": 0,
        "borderTopRightRadius": 7,
        "borderBottomRightRadius": 7,
        "borderBottomLeftRadius": 7,
        "backgroundColor": "#333",
        "color": "#fff",
        "textDecorationLine": "none",
        "textDecorationColor": "black",
        "textDecorationStyle": "solid",
        "fontSize": 17,
        "fontWeight": "500",
        "marginTop": 0,
        "marginRight": "5%",
        "marginBottom": 0,
        "marginLeft": "5%",
        "cursor": "default"
    },
    messageText: {
        "marginRight": 10,
        "pointerEvents": "none"
    },
    icon: {}
});

