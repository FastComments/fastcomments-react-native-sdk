// @ts-ignore TODO remove
import * as React from 'react';
import {View, StyleSheet, ViewStyle} from "react-native";

export interface ThreeDotProps {
    style?: ViewStyle
}

export function ThreeDot({style}: ThreeDotProps) {
    return <View style={[styles.dots, style]}>
        <View style={styles.dot}/>
        <View style={styles.dot}/>
        <View style={styles.dot}/>
    </View>
}

const styles = StyleSheet.create({
    dots: {
        flexDirection: 'row',
        alignItems: "center",
        alignContent: 'center',
        justifyItems: 'center',
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
