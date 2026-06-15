import {Dispatch, ReactNode, SetStateAction, useRef, useState} from 'react';
import {ActivityIndicator, Image, ImageURISource, Modal, Platform, Text, TouchableOpacity, View} from "react-native";
import {IFastCommentsStyles} from "../types";
import {MentionPortal} from './mention-portal';
import {measureAnchorRect, useAnchoredPosition, useDismissOnOutsideClick} from '../services/web-anchor';

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

/** Viewport rect of the trigger, captured when the menu was requested. **/
export interface ModalMenuAnchor {
    bottom: number
    right: number
}

export interface ModalMenuProps {
    closeIcon: ImageURISource
    isOpen?: boolean
    items: ModalMenuItem[]
    onClose?: () => void
    openButton?: ReactNode
    /** Web: anchors the menu as a dropdown under the trigger instead of a centered modal. **/
    anchor?: ModalMenuAnchor
    styles: IFastCommentsStyles
}

const MENU_DROPDOWN_WIDTH = 220;

export function ModalMenu({
    closeIcon,
    isOpen,
    items,
    openButton,
    onClose,
    anchor,
    styles,
}: ModalMenuProps) {
    const [activeModalId, setModalIdVisible] = useState<string | null>(isOpen ? 'menu' : null);
    const [isLoading, setLoading] = useState(false);
    const openButtonRef = useRef<TouchableOpacity>(null);
    const dropdownRef = useRef<View>(null);

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

    // Web renders the MENU as a dropdown anchored to the trigger (the supplied
    // anchor rect, or this component's own open button), portaled to the body
    // so the comment list cannot clip or overpaint it. Sub-modals (e.g. the
    // edit form) remain centered modals on every platform.
    const isWebDropdown = Platform.OS === 'web' && typeof document !== 'undefined';
    const isMenuOpen = isWebDropdown && activeModalId === 'menu';
    const dropdownPosition = useAnchoredPosition(isMenuOpen, ({ scrollX, scrollY }) => {
        const rect = anchor ?? measureAnchorRect(openButtonRef);
        if (!rect) return null;
        return {
            position: 'absolute',
            top: rect.bottom + scrollY + 4,
            left: Math.max(8, rect.right - MENU_DROPDOWN_WIDTH) + scrollX,
            zIndex: 2147483000,
        };
    }, [anchor]);
    useDismissOnOutsideClick(isMenuOpen, () => void close(false), [openButtonRef, dropdownRef]);

    const menuOptions = items.map((item) =>
        <TouchableOpacity
            key={item.id}
            testID={`menuItem-${item.id}`}
            accessibilityLabel={`menuItem-${item.id}`}
            style={styles.modalMenu?.menuOptionButton} onPress={async () => {
            setLoading(true);
            let openedSubModal = false;
            await item.handler((newModalId) => {
                if (newModalId === null) {
                    close(false);
                } else {
                    openedSubModal = true;
                    setModalIdVisible(newModalId);
                }
            });
            setLoading(false);
            // Selecting an item closes the menu unless it navigated to a
            // sub-modal. The web outside-click listener now excludes the menu
            // content (so it no longer doubles as the "selected, close it"
            // path), and items like pin/unpin never touch the modal id.
            if (!openedSubModal) close(true);
        }}
        >
            {item.icon}
            <Text style={styles.modalMenu?.menuOptionText}>{item.label}</Text>
        </TouchableOpacity>
    );

    const menu = isWebDropdown
        ? (activeModalId === 'menu' ? (
            <MentionPortal>
                <View ref={dropdownRef} style={[dropdownPosition ?? { position: 'absolute', top: 0, left: 0, opacity: 0 }, styles.modalMenu?.dropdown]}>
                    {menuOptions}
                    {isLoading && <ActivityIndicator size="small"/>}
                </View>
            </MentionPortal>
        ) : null)
        : (
            <Modal
                animationType="slide"
                transparent={true}
                visible={activeModalId === 'menu'}
                onRequestClose={() => close(false)}
            >
                <View style={styles.modalMenu?.centeredView}>
                    <View style={styles.modalMenu?.modalView}>
                        {menuOptions}
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
        );

    return <View style={styles.modalMenu?.rootView}>
        {activeModalId && <View>
            {menu}
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
        {openButton && <TouchableOpacity ref={openButtonRef} testID="modalMenuOpenButton" accessibilityLabel="modalMenuOpenButton" onPress={() => setModalIdVisible('menu')}>
            {openButton}
        </TouchableOpacity>}
    </View>;
}
