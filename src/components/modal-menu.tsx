import {Dispatch, ReactNode, SetStateAction, useState} from 'react';
import {ActivityIndicator, Image, ImageURISource, Modal, Text, TouchableOpacity, View} from "react-native";
import {IFastCommentsStyles} from "../types";

export const CAN_CLOSE = true;
export const CAN_NOT_CLOSE = false;

export interface ModalMenuItem {
    id: string
    label: string
    handler: (setModalId: Dispatch<SetStateAction<string | null>>) => void
    icon?: ReactNode
    subModalContent?: (close: (safe?: boolean) => void) => ReactNode // if safe, won't call/check requestClose
    requestClose?: () => Promise<typeof CAN_CLOSE | typeof CAN_NOT_CLOSE> // return true if can close
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

    async function close(isSafe?: boolean) {
        if (
            !isSafe
            && activeModalId
            && activeModalId !== 'menu'
            && items
        ) {
            const currentItem = items.find((item) => item.id === activeModalId);
            if (currentItem && currentItem.requestClose) {
                const requestResult = await currentItem.requestClose(); // will return false cancel
                if (requestResult === CAN_NOT_CLOSE) {
                    return;
                }
            }
        }
        setModalIdVisible(null);
        onClose && onClose();
    }

    return <View style={styles.modalMenu?.rootView}>
        {activeModalId && <View>
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'menu'}
                onRequestClose={() => close(false)}
            >
                <View style={styles.modalMenu?.centeredView}>
                    <View style={styles.modalMenu?.modalView}>
                        {items.map((item) =>
                            <TouchableOpacity
                                key={item.id}
                                style={styles.modalMenu?.menuOptionButton} onPress={async () => {
                                setLoading(true);
                                await item.handler((newModalId) => {
                                    if (newModalId === null) {
                                        close(false);
                                    } else {
                                        setModalIdVisible(newModalId);
                                    }
                                });
                                setLoading(false);
                            }}
                            >
                                {item.icon}
                                <Text style={styles.modalMenu?.menuOptionText}>{item.label}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.modalMenu?.modalCancel}
                            onPress={() => close(false)}
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
                {!!activeModalId && activeModalId !== 'menu' && items && items.find((item) => item.subModalContent && item.id === activeModalId)?.subModalContent!((isSafe) => {
                    // noinspection JSIgnoredPromiseFromCall
                    close(isSafe);
                })}
            </Modal>
        </View>}
        {openButton && <TouchableOpacity onPress={() => setModalIdVisible('menu')}>
            {openButton}
        </TouchableOpacity>}
    </View>;
}
