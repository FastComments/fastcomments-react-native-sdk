import { IFastCommentsStyles } from '../types';
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { canPaginatePrev } from '../services/pagination';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export function PaginationPrev({
    store,
    styles,
    doPaginate,
}: {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    doPaginate: () => void;
}) {
    const page = useStoreValue(store, (s) => s.page);
    const pagesLoaded = useStoreValue(store, (s) => s.pagesLoaded);
    const translations = useStoreValue(store, (s) => s.translations);
    const { width } = useWindowDimensions();
    void page;
    void pagesLoaded;

    if (!canPaginatePrev(store)) return null;

    return (
        <View style={styles.paginationPrev?.root}>
            <TouchableOpacity onPress={doPaginate}>
                <RenderHtml
                    source={{ html: translations.PREV }}
                    contentWidth={width}
                    baseStyle={styles.paginationPrev?.text}
                    tagsStyles={styles.paginationPrev?.prevHTMLStyles}
                />
            </TouchableOpacity>
        </View>
    );
}
