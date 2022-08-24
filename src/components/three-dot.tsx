// @ts-ignore TODO remove
import * as React from 'react';
import {View, StyleSheet} from "react-native";

export function ThreeDot() {
    return <View style={styles.dots}>
        <View style={styles.dot}/>
    </View>
}

const styles = StyleSheet.create({
    dots: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    dot: {
        "width": 4,
        "height": 4,
        "backgroundColor": "#333",
        "borderTopLeftRadius": 4,
        "borderTopRightRadius": 4,
        "borderBottomRightRadius": 4,
        "borderBottomLeftRadius": 4,
        "marginTop": 0,
        "marginRight": 2,
        "marginBottom": 0,
        "marginLeft": 2
    }
});
