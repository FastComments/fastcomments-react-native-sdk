import { FastCommentsSortDirection, FastCommentsImageAsset, IFastCommentsStyles } from '../types';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useRef, useState } from 'react';
import { ModalMenu } from './modal-menu';
import { MentionPortal } from './mention-portal';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';
import { measureAnchorRect, useAnchoredPosition, useDismissOnOutsideClick } from '../services/web-anchor';

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
    const buttonRef = useRef<TouchableOpacity>(null);
    const dropdownRef = useRef<View>(null);

    const setValue = (newValue: FastCommentsSortDirection) => store.getState().setSortDirection(newValue);
    const menuItems = [
        { label: translations.OLDEST_FIRST, id: 'OF', handler: () => setValue('OF') },
        { label: translations.NEWEST_FIRST, id: 'NF', handler: () => setValue('NF') },
        { label: translations.MOST_RELEVANT, id: 'MR', handler: () => setValue('MR') },
    ];

    // Web: a dropdown anchored under the trigger (right edges aligned),
    // portaled to the body with page coordinates so the comment list cannot
    // clip or overpaint it. Closes on outside click, scroll-tracked.
    const dropdownPosition = useAnchoredPosition(isOpen, ({ scrollX, scrollY }) => {
        const rect = measureAnchorRect(buttonRef);
        if (!rect) return null;
        return {
            position: 'absolute',
            top: rect.bottom + scrollY + 4,
            left: Math.max(8, rect.right - DROPDOWN_WIDTH) + scrollX,
            zIndex: 2147483000,
        };
    });
    useDismissOnOutsideClick(isOpen, () => setIsOpen(false), [buttonRef, dropdownRef]);

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
                    <View ref={dropdownRef} style={[dropdownPosition ?? { position: 'absolute', top: 0, left: 0, opacity: 0 }, styles.selectSortDirection?.dropdown]}>
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
