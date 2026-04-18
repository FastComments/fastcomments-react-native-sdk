import { FastCommentsSortDirection, FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import { View, Text } from 'react-native';
import { ModalMenu } from './modal-menu';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

const SortDirectionTranslationsById: Record<string, string> = {
    OF: 'OLDEST_FIRST',
    NF: 'NEWEST_FIRST',
    MR: 'MOST_RELEVANT',
};

export interface SelectSortDirectionProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function SelectSortDirection({ store, styles }: SelectSortDirectionProps) {
    const translations = useStoreValue(store, (s) => s.translations);
    const sortDirection = useStoreValue(store, (s) => s.sortDirection);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);

    const setValue = (newValue: FastCommentsSortDirection) => store.getState().setSortDirection(newValue);
    const menuItems = [
        { label: translations.OLDEST_FIRST, id: 'OF', handler: () => setValue('OF') },
        { label: translations.NEWEST_FIRST, id: 'NF', handler: () => setValue('NF') },
        { label: translations.MOST_RELEVANT, id: 'MR', handler: () => setValue('MR') },
    ];

    const openButton = (
        <View style={styles.selectSortDirection?.openButton}>
            <Text style={styles.selectSortDirection?.text}>
                {translations[SortDirectionTranslationsById[sortDirection]]}
            </Text>
            <View style={styles.selectSortDirection?.downCarrot} />
        </View>
    );

    return (
        <ModalMenu
            closeIcon={
                imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]
            }
            items={menuItems}
            openButton={openButton}
            styles={styles}
        />
    );
}
