// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsSortDirection, FastCommentsState} from "../types/fastcomments-state";
import {State, useHookstate} from "@hookstate/core";
import {Image, StyleSheet, View, Text} from 'react-native';
import {FastCommentsImageAsset} from "../types/image-asset";
import {ModalMenu} from "./modal-menu";

const SortDirectionTranslationsById: Record<string, string> = {
    'OF': 'OLDEST_FIRST',
    'NF': 'NEWEST_FIRST',
    'MR': 'MOST_RELEVANT',
};

export function SelectSortDirection(globalState: State<FastCommentsState>) {
    const state = useHookstate(globalState); // OPTIMIZATION: local state
    const setValue = (newValue: any) => state.sortDirection.set(newValue as FastCommentsSortDirection);
    const menuItems = [
        {label: state.translations.OLDEST_FIRST.get(), id: 'OF', handler: () => { setValue('OF') } },
        {label: state.translations.NEWEST_FIRST.get(), id: 'NF', handler: () => { setValue('NF') } },
        {label: state.translations.MOST_RELEVANT.get(), id: 'MR', handler: () => { setValue('MR') } },
    ];

    // TODO dedicated down carrot icon
    const openButton = <View style={styles.openButton}>
        <Text style={styles.text}>{state.translations[SortDirectionTranslationsById[state.sortDirection.get()]].get()}</Text>
        <Image source={state.imageAssets[FastCommentsImageAsset.ICON_DOWN_ACTIVE].get()} style={styles.downCarrot}/>
    </View>;

    return <ModalMenu state={state} items={menuItems} openButton={openButton}/>;
}

const styles = StyleSheet.create({
    openButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 5,
    },
    text: {
        marginRight: 5,
        fontSize: 12,
        fontWeight: '500'
    },
    downCarrot: {
        width: 14,
        aspectRatio: 1,
        resizeMode: 'contain'
    }
})
