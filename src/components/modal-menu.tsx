import {Dispatch, ReactNode, SetStateAction, useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, ImageURISource, Modal, Platform, Text, TouchableOpacity, View, type ViewStyle} from "react-native";
import {IFastCommentsStyles} from "../types";
import {MentionPortal} from './mention-portal';

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
    const [dropdownPosition, setDropdownPosition] = useState<ViewStyle | null>(null);
    const openButtonRef = useRef<TouchableOpacity>(null);

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
    useEffect(() => {
        if (!isWebDropdown || activeModalId !== 'menu') return;
        const win = globalThis as unknown as {
            addEventListener?: (t: string, h: () => void, c?: boolean) => void;
            removeEventListener?: (t: string, h: () => void, c?: boolean) => void;
            scrollX?: number;
            scrollY?: number;
        };
        const reposition = () => {
            let rect: ModalMenuAnchor | undefined = anchor;
            if (!rect) {
                const button = openButtonRef.current as unknown as { getBoundingClientRect?: () => { bottom: number; right: number } } | null;
                rect = button?.getBoundingClientRect?.();
            }
            if (!rect) return;
            setDropdownPosition({
                position: 'absolute',
                top: rect.bottom + (win.scrollY ?? 0) + 4,
                left: Math.max(8, rect.right - MENU_DROPDOWN_WIDTH) + (win.scrollX ?? 0),
                zIndex: 2147483000,
            });
        };
        const closeOnOutsideClick = () => void close(false);
        reposition();
        win.addEventListener?.('scroll', reposition, true);
        win.addEventListener?.('resize', reposition);
        document.addEventListener('click', closeOnOutsideClick);
        return () => {
            win.removeEventListener?.('scroll', reposition, true);
            win.removeEventListener?.('resize', reposition);
            document.removeEventListener('click', closeOnOutsideClick);
        };
    }, [activeModalId, anchor]);

    const menuOptions = items.map((item) =>
        <TouchableOpacity
            key={item.id}
            testID={`menuItem-${item.id}`}
            accessibilityLabel={`menuItem-${item.id}`}
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
    );

    const menu = isWebDropdown
        ? (activeModalId === 'menu' ? (
            <MentionPortal>
                <View style={[dropdownPosition ?? { position: 'absolute', top: 0, left: 0, opacity: 0 }, styles.modalMenu?.dropdown]}>
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
