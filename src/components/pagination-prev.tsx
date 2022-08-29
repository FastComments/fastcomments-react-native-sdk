// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text, View} from "react-native";
import {State} from "@hookstate/core";

export function PaginationPrev({state}: {state: State<FastCommentsState>}) {
    return <View style={styles.pagination}>
        <Text>{state.translations.PREV_30.get()}</Text>
    </View>;
}

const styles = StyleSheet.create({
    pagination: {
        "marginTop": "50px",
        "lineHeight": "19px",
        "textAlign": "center"
    },
})
