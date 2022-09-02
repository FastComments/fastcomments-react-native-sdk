// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {useWindowDimensions, View} from "react-native";
import {State} from "@hookstate/core";
import RenderHtml from 'react-native-render-html';
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export function PaginationNext({state, styles}: { state: State<FastCommentsState>, styles: IFastCommentsStyles }) {
    const shouldShowPagination = state.page.get() !== -1 && state.commentCountOnClient.get() > state.PAGE_SIZE.get() && state.hasMore.get();
    if (shouldShowPagination) {
        const {width} = useWindowDimensions();
        // TODO: check if loading, set opacity: 0.5
        // These translations contain HTML.
        return <View style={styles.paginationNext?.root}>
            <RenderHtml source={{
                html: state.translations.NEXT_30.get()
            }} contentWidth={width} baseStyle={styles.paginationNext?.next}/>
            {
                state.commentCountOnServer.get() < 2000 &&
                <RenderHtml source={{
                    html: state.translations.LOAD_ALL.get().replace('[count]', Number(state.commentCountOnServer.get()).toLocaleString())
                }} contentWidth={width} baseStyle={styles.paginationNext?.all}/>
            }
        </View>;
    }
    return null;
}
