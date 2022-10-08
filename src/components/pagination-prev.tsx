import {FastCommentsState, IFastCommentsStyles} from "../types";
import {TouchableOpacity, useWindowDimensions, View} from "react-native";
import {State} from "@hookstate/core";
import RenderHtml from 'react-native-render-html';
import {canPaginatePrev} from "../services/pagination";

export function PaginationPrev({state, styles, doPaginate}: { state: State<FastCommentsState>, styles: IFastCommentsStyles, doPaginate: () => void  }) {
    if (canPaginatePrev(state)) {
        const {width} = useWindowDimensions();
        return <View style={styles.paginationPrev?.root}>
            <TouchableOpacity onPress={doPaginate}>
                <RenderHtml source={{
                    html: state.translations.PREV_30.get()
                }} contentWidth={width} baseStyle={styles.paginationPrev?.text} tagsStyles={styles.paginationPrev?.prevHTMLStyles}/>
            </TouchableOpacity>
        </View>;
    }
    return null;
}
