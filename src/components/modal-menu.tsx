// @ts-ignore TODO remove
import * as React from 'react';
import {FastCommentsImageAsset} from "../types/image-asset";
import {ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {Dispatch, ReactNode, SetStateAction, useState} from "react";
import {FastCommentsState} from "../types/fastcomments-state";
import {State} from "@hookstate/core";

export interface ModalMenuItem {
    id: string;
    label: string;
    handler: (setModalId: Dispatch<SetStateAction<string | null>>) => void;
    icon?: ReactNode;
    subModalContent?: (close: () => void) => ReactNode;
}

export interface ModalMenuProps {
    state: State<FastCommentsState>,
    items: ModalMenuItem[];
    openButton: ReactNode;
}

export function ModalMenu({state, items, openButton} : ModalMenuProps) {
    const [activeModalId, setModalIdVisible] = useState<string | null>(null);
    const [isLoading, setLoading] = useState(false);
    return <View style={styles.rootView}>
            <View style={styles.centeredView}>
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'menu'}
                onRequestClose={() => {
                    setModalIdVisible(null);
                }}
            >
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        {items.map((item) =>
                            <Pressable
                                key={item.label}
                                style={styles.menuOptionButton} onPress={async () => {
                                setLoading(true);
                                await item.handler(setModalIdVisible);
                                setLoading(false);
                            }}
                            >
                                {item.icon}
                                <Text style={styles.menuOptionText}>{item.label}</Text>
                            </Pressable>
                        )}
                        <Pressable
                            style={styles.modalCancel}
                            onPress={() => setModalIdVisible(null)}
                        >
                            {<Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_CROSS]} style={{width: 16, height: 16}}/>}
                        </Pressable>
                        {
                            isLoading && <View style={styles.loadingView}>
                                <ActivityIndicator size="large"/>
                            </View>
                        }
                    </View>
                </View>
            </Modal>
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'edit'}
                onRequestClose={() => {
                    setModalIdVisible(null);
                }}>
                {activeModalId !== 'edit' && items && items.find((item) => item.subModalContent && item.id === activeModalId)?.subModalContent!(() => setModalIdVisible(null))}
            </Modal>
        </View>
        <Pressable onPress={() => setModalIdVisible('menu')}>
            {openButton}
        </Pressable>
    </View>;
}

const styles = StyleSheet.create({
    rootView: {
        flexDirection: 'row', // gets inline menu items like three-dot centered
    },
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    menuOptionButton: {
        flexDirection: 'row',
        minWidth: 100,
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        elevation: 2,
        color: 'black'
    },
    menuOptionText: {
        paddingLeft: 10,
        color: "black",
        fontWeight: "bold",
        textAlign: "left"
    },
    modalCancel: {
        position: 'absolute',
        top: 10,
        right: 10
    },
    loadingView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff80'
    }
});
