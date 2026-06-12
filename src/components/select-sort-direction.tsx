import { FastCommentsSortDirection, FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import { View, Text, TouchableOpacity, Platform, type ViewStyle } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { ModalMenu } from './modal-menu';
import { MentionPortal } from './mention-portal';
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

const DROPDOWN_WIDTH = 200;

export function SelectSortDirection({ store, styles }: SelectSortDirectionProps) {
    const translations = useStoreValue(store, (s) => s.translations);
    const sortDirection = useStoreValue(store, (s) => s.sortDirection);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const [isOpen, setIsOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState<ViewStyle | null>(null);
    const buttonRef = useRef<TouchableOpacity>(null);

    const setValue = (newValue: FastCommentsSortDirection) => store.getState().setSortDirection(newValue);
    const menuItems = [
        { label: translations.OLDEST_FIRST, id: 'OF', handler: () => setValue('OF') },
        { label: translations.NEWEST_FIRST, id: 'NF', handler: () => setValue('NF') },
        { label: translations.MOST_RELEVANT, id: 'MR', handler: () => setValue('MR') },
    ];

    // Web: a dropdown anchored under the trigger (right edges aligned),
    // portaled to the body with page coordinates so the comment list cannot
    // clip or overpaint it. Closes on outside click, scroll-tracked.
    useEffect(() => {
        if (Platform.OS !== 'web' || !isOpen || typeof document === 'undefined') return;
        const win = globalThis as unknown as {
            addEventListener?: (t: string, h: () => void, c?: boolean) => void;
            removeEventListener?: (t: string, h: () => void, c?: boolean) => void;
            scrollX?: number;
            scrollY?: number;
        };
        const reposition = () => {
            const button = buttonRef.current as unknown as { getBoundingClientRect?: () => { bottom: number; right: number } } | null;
            const rect = button?.getBoundingClientRect?.();
            if (!rect) return;
            setDropdownPosition({
                position: 'absolute',
                top: rect.bottom + (win.scrollY ?? 0) + 4,
                left: Math.max(8, rect.right - DROPDOWN_WIDTH) + (win.scrollX ?? 0),
                zIndex: 2147483000,
            });
        };
        const closeOnOutsideClick = () => setIsOpen(false);
        reposition();
        win.addEventListener?.('scroll', reposition, true);
        win.addEventListener?.('resize', reposition);
        // Selection handlers run before this bubbles back to document.
        document.addEventListener('click', closeOnOutsideClick);
        return () => {
            win.removeEventListener?.('scroll', reposition, true);
            win.removeEventListener?.('resize', reposition);
            document.removeEventListener('click', closeOnOutsideClick);
        };
    }, [isOpen]);

    const openButtonContent = (
        <View style={styles.selectSortDirection?.openButton}>
            <Text style={styles.selectSortDirection?.text}>
                {translations[SortDirectionTranslationsById[sortDirection]]}
            </Text>
            <View style={styles.selectSortDirection?.downCarrot} />
        </View>
    );

    if (Platform.OS !== 'web') {
        return (
            <ModalMenu
                closeIcon={
                    imageAssets[hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]
                }
                items={menuItems}
                openButton={openButtonContent}
                styles={styles}
            />
        );
    }

    return (
        <View>
            <TouchableOpacity
                ref={buttonRef}
                testID="sortDirectionButton"
                accessibilityLabel="sortDirectionButton"
                onPress={() => setIsOpen(!isOpen)}
            >
                {openButtonContent}
            </TouchableOpacity>
            {isOpen && (
                <MentionPortal>
                    <View style={[dropdownPosition ?? { position: 'absolute', top: 0, left: 0, opacity: 0 }, styles.selectSortDirection?.dropdown]}>
                        {menuItems.map((item) => {
                            const isSelected = item.id === sortDirection;
                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    testID={`sortOption-${item.id}`}
                                    accessibilityLabel={`sortOption-${item.id}`}
                                    style={[styles.selectSortDirection?.option, isSelected && styles.selectSortDirection?.optionSelected]}
                                    onPress={() => {
                                        setIsOpen(false);
                                        item.handler();
                                    }}
                                >
                                    <Text style={[styles.selectSortDirection?.optionText, isSelected && styles.selectSortDirection?.optionTextSelected]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </MentionPortal>
            )}
        </View>
    );
}
