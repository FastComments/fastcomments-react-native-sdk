// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState, IFastCommentsStyles} from "../types";
import {TouchableOpacity, useWindowDimensions, View} from "react-native";
import {State} from "@hookstate/core";
import RenderHtml from 'react-native-render-html';
import {canPaginateNext} from "../services/pagination";

export function PaginationNext({state, styles, doPaginate}: { state: State<FastCommentsState>, styles: IFastCommentsStyles, doPaginate: (isAll: boolean) => void }) {
    if (canPaginateNext(state)) {
        const {width} = useWindowDimensions();
        // These translations contain HTML.
        return <View style={styles.paginationNext?.root}>
            <TouchableOpacity onPress={() => doPaginate(false)}><RenderHtml source={{
                html: state.translations.NEXT_30.get()
            }} contentWidth={width} baseStyle={styles.paginationNext?.next} tagsStyles={styles.paginationNext?.nextHTMLStyles}/></TouchableOpacity>
            {
                state.commentCountOnServer.get() < 2000 &&
                <TouchableOpacity onPress={() => doPaginate(true)}><RenderHtml source={{
                    html: state.translations.LOAD_ALL.get().replace('[count]', '(' + Number(state.commentCountOnServer.get()).toLocaleString() + ')')
                }} contentWidth={width} baseStyle={styles.paginationNext?.all} tagsStyles={styles.paginationNext?.allHTMLStyles}/></TouchableOpacity>
            }
        </View>;
    }
    return null;
}
