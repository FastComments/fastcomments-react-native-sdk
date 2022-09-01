// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {useWindowDimensions, View} from "react-native";
import {State} from "@hookstate/core";
import RenderHtml from 'react-native-render-html';
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export function PaginationPrev({state, styles}: {state: State<FastCommentsState>, styles: IFastCommentsStyles}) {
    const {width} = useWindowDimensions();
    return <View style={styles.paginationPrev.root}>
            <RenderHtml source={{
                html: state.translations.PREV_30.get()
            }} contentWidth={width} baseStyle={styles.paginationPrev.text}/>
    </View>;
}
