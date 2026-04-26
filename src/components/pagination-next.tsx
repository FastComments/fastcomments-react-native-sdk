import { IFastCommentsStyles } from '../types';
import { TouchableOpacity, useWindowDimensions, View } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { canPaginateNext } from '../services/pagination';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export function PaginationNext({
    store,
    styles,
    doPaginate,
}: {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    doPaginate: (isAll: boolean) => void;
}) {
    const hasMore = useStoreValue(store, (s) => s.hasMore);
    const translations = useStoreValue(store, (s) => s.translations);
    const commentCountOnServer = useStoreValue(store, (s) => s.commentCountOnServer);
    const { width } = useWindowDimensions();

    if (!canPaginateNext(store)) return null;
    void hasMore;

    return (
        <View
            testID="paginationControls"
            accessibilityLabel="paginationControls"
            style={styles.paginationNext?.root}
        >
            <TouchableOpacity
                testID="btnNextComments"
                accessibilityLabel="btnNextComments"
                onPress={() => doPaginate(false)}
            >
                <RenderHtml
                    source={{ html: translations.NEXT }}
                    contentWidth={width}
                    baseStyle={styles.paginationNext?.next}
                    tagsStyles={styles.paginationNext?.nextHTMLStyles}
                />
            </TouchableOpacity>
            {commentCountOnServer < 2000 && (
                <TouchableOpacity
                    testID="btnLoadAllComments"
                    accessibilityLabel="btnLoadAllComments"
                    onPress={() => doPaginate(true)}
                >
                    <RenderHtml
                        source={{
                            html: translations.LOAD_ALL.replace(
                                '[count]',
                                '(' + Number(commentCountOnServer).toLocaleString() + ')'
                            ),
                        }}
                        contentWidth={width}
                        baseStyle={styles.paginationNext?.all}
                        tagsStyles={styles.paginationNext?.allHTMLStyles}
                    />
                </TouchableOpacity>
            )}
        </View>
    );
}
