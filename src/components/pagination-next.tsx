// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text, View} from "react-native";
import {State} from "@hookstate/core";

export function PaginationNext({state}: { state: State<FastCommentsState> }) {
    const shouldShowPagination = state.page.get() !== -1 && state.commentCountOnClient.get() > state.PAGE_SIZE.get() && state.hasMore.get();
    if (shouldShowPagination) {
        // TODO: check if loading, set opacity: 0.5
        // TODO: these translations contain HTML, define new ones?
        return <View style={styles.pagination}>
            <Text style={styles.all}>{state.translations.NEXT_30.get()}</Text>
            {
                state.commentCountOnServer.get() < 2000 && <Text
                    style={styles.all}>{(state.translations.LOAD_ALL.get() || '').replace('[count]', Number(state.commentCountOnServer.get()).toLocaleString())}</Text>
            }
        </View>;
    }
    return null;
}

const styles = StyleSheet.create({
    pagination: {
        "marginTop": "50px",
        "lineHeight": "19px",
        "textAlign": "center"
    },
    next: {
    },
    all: {}
});
