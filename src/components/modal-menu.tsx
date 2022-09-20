// @ts-ignore TODO remove
import * as React from 'react';
import {Dispatch, ReactNode, SetStateAction, useState} from 'react';
import {ActivityIndicator, Image, ImageURISource, Modal, Text, TouchableOpacity, View} from "react-native";
import {IFastCommentsStyles} from "../types";

export interface ModalMenuItem {
    id: string
    label: string
    handler: (setModalId: Dispatch<SetStateAction<string | null>>) => void
    icon?: ReactNode
    subModalContent?: (close: () => void) => ReactNode
}

export interface ModalMenuProps {
    closeIcon: ImageURISource
    isOpen?: boolean
    items: ModalMenuItem[]
    onClose?: () => void
    openButton?: ReactNode
    styles: IFastCommentsStyles
}

export function ModalMenu({
    closeIcon,
    isOpen,
    items,
    openButton,
    onClose,
    styles,
}: ModalMenuProps) {
    const [activeModalId, setModalIdVisible] = useState<string | null>(isOpen ? 'menu' : null);
    const [isLoading, setLoading] = useState(false);
    return <View style={styles.modalMenu?.rootView}>
        {activeModalId && <View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'menu'}
                onRequestClose={() => {
                    setModalIdVisible(null);
                }}
            >
                <View style={styles.modalMenu?.centeredView}>
                    <View style={styles.modalMenu?.modalView}>
                        {items.map((item) =>
                            <TouchableOpacity
                                key={item.id}
                                style={styles.modalMenu?.menuOptionButton} onPress={async () => {
                                setLoading(true);
                                await item.handler(setModalIdVisible);
                                setLoading(false);
                            }}
                            >
                                {item.icon}
                                <Text style={styles.modalMenu?.menuOptionText}>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.modalMenu?.modalCancel}
                            onPress={() => setModalIdVisible(null)}
                        >
                            {<Image source={closeIcon} style={styles.modalMenu?.menuCancelIcon}/>}
                        </TouchableOpacity>
                        {
                            isLoading && <View style={styles.modalMenu?.loadingView}>
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
                    onClose && onClose();
                }}>
                {!!activeModalId && activeModalId !== 'menu' && items && items.find((item) => item.subModalContent && item.id === activeModalId)?.subModalContent!(() => setModalIdVisible(null))}
            </Modal>
        </View>}
        {openButton && <TouchableOpacity onPress={() => setModalIdVisible('menu')}>
            {openButton}
        </TouchableOpacity>}
    </View>;
}
