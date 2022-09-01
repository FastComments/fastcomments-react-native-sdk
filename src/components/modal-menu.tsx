// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsImageAsset} from "../types/image-asset";
import {ActivityIndicator, Image, Modal, Text, TouchableOpacity, View} from "react-native";
import {Dispatch, ReactNode, SetStateAction, useState} from "react";
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface ModalMenuItem {
    id: string;
    label: string;
    handler: (setModalId: Dispatch<SetStateAction<string | null>>) => void;
    icon?: ReactNode;
    subModalContent?: (close: () => void) => ReactNode;
}

export interface ModalMenuProps {
    state: State<FastCommentsState>,
    styles: IFastCommentsStyles,
    items: ModalMenuItem[];
    openButton: ReactNode;
}

export function ModalMenu({state, styles, items, openButton}: ModalMenuProps) {
    const [activeModalId, setModalIdVisible] = useState<string | null>(null);
    const [isLoading, setLoading] = useState(false);
    return <View style={styles.modalMenu.rootView}>
        <View style={styles.modalMenu.centeredView}>
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'menu'}
                onRequestClose={() => {
                    setModalIdVisible(null);
                }}
            >
                <View style={styles.modalMenu.centeredView}>
                    <View style={styles.modalMenu.modalView}>
                        {items.map((item) =>
                            <TouchableOpacity
                                key={item.label}
                                style={styles.modalMenu.menuOptionButton} onPress={async () => {
                                setLoading(true);
                                await item.handler(setModalIdVisible);
                                setLoading(false);
                            }}
                            >
                                {item.icon}
                                <Text style={styles.modalMenu.menuOptionText}>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.modalMenu.modalCancel}
                            onPress={() => setModalIdVisible(null)}
                        >
                            {<Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_CROSS]} style={{width: 16, height: 16}}/>}
                        </TouchableOpacity>
                        {
                            isLoading && <View style={styles.modalMenu.loadingView}>
                                <ActivityIndicator size="large"/>
                            </View>
                        }
                    </View>
                </View>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={!!activeModalId && activeModalId !== 'menu'}
                onRequestClose={() => {
                    setModalIdVisible(null);
                }}>
                {!!activeModalId && activeModalId !== 'menu' && items && items.find((item) => item.subModalContent && item.id === activeModalId)?.subModalContent!(() => setModalIdVisible(null))}
            </Modal>
        </View>
        <TouchableOpacity onPress={() => setModalIdVisible('menu')}>
            {openButton}
        </TouchableOpacity>
    </View>;
}
