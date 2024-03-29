import {FastCommentsSortDirection, FastCommentsState, FastCommentsImageAsset, IFastCommentsStyles} from "../types";
import {State, useHookstate} from "@hookstate/core";
import {View, Text} from 'react-native';
import {ModalMenu} from "./modal-menu";

const SortDirectionTranslationsById: Record<string, string> = {
    'OF': 'OLDEST_FIRST',
    'NF': 'NEWEST_FIRST',
    'MR': 'MOST_RELEVANT',
};

export interface SelectSortDirectionProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function SelectSortDirection(props: SelectSortDirectionProps) {
    const {styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: local state
    const setValue = (newValue: any) => state.sortDirection.set(newValue as FastCommentsSortDirection);
    const menuItems = [
        {label: state.translations.OLDEST_FIRST.get(), id: 'OF', handler: () => { setValue('OF') } },
        {label: state.translations.NEWEST_FIRST.get(), id: 'NF', handler: () => { setValue('NF') } },
        {label: state.translations.MOST_RELEVANT.get(), id: 'MR', handler: () => { setValue('MR') } },
    ];

    const openButton = <View style={styles.selectSortDirection?.openButton}>
        <Text style={styles.selectSortDirection?.text}>{state.translations[SortDirectionTranslationsById[state.sortDirection.get()]].get()}</Text>
        <View style={styles.selectSortDirection?.downCarrot}/>
    </View>;

    return <ModalMenu closeIcon={state.imageAssets[state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS].get()} items={menuItems} openButton={openButton} styles={styles}/>;
}
