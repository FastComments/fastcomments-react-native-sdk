import { Image, View, Text, TouchableOpacity, Modal, Platform, type ViewStyle } from 'react-native';
import { FastCommentsImageAsset, ImageAssetConfig } from '../types';
import { useMemo, useRef, useState, type ComponentRef } from 'react';
import { IFastCommentsStyles } from '../types';
import { NotificationList } from './notification-list';
import { MentionPortal } from './mention-portal';
import { measureAnchorRect, placeVertical, useAnchoredPosition, useDismissOnOutsideClick } from '../services/web-anchor';
import { FastCommentsCallbacks } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

const NOTIFICATION_DROPDOWN_WIDTH = 360;

export interface NotificationBellProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    imageAssets: ImageAssetConfig;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

export function NotificationBell({
    imageAssets,
    onNotificationSelected,
    store,
    styles,
    translations,
}: NotificationBellProps) {
    const [isOpen, setNotificationsListOpen] = useState(false);
    const disableNotificationBell = useStoreValue(store, (s) => !!s.config.disableNotificationBell);
    const notificationCount = useStoreValue(store, (s) => s.userNotificationState.count);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    // Web: anchor the list as a dropdown under the bell (portaled to the body so
    // the comment list cannot clip it), like the comment/sort menus. Native
    // keeps the centered modal.
    const bellRef = useRef<ComponentRef<typeof TouchableOpacity>>(null);
    const dropdownRef = useRef<View>(null);
    const isWebDropdown = Platform.OS === 'web' && typeof document !== 'undefined';
    const dropdownPosition = useAnchoredPosition(isWebDropdown && isOpen, ({ scrollX, scrollY, overlayHeight, viewportHeight }) => {
        const rect = measureAnchorRect(bellRef);
        if (!rect) return null;
        // Flip only - the list keeps its own maxHeight (440) + internal scroll,
        // so we don't clamp the wrapper (which would clip the nested scroller).
        const { top } = placeVertical({ anchor: rect, scrollY, overlayHeight, viewportHeight });
        return {
            position: 'absolute',
            top,
            left: Math.max(8, rect.right - NOTIFICATION_DROPDOWN_WIDTH) + scrollX,
            zIndex: 2147483000,
        };
    }, [], dropdownRef);
    useDismissOnOutsideClick(isWebDropdown && isOpen, () => setNotificationsListOpen(false), [bellRef, dropdownRef]);

    // The dropdown wrapper is the card; flatten the list's own modal chrome
    // (screen margin/background/shadow) and bound its height so it scrolls.
    const webListStyles = useMemo<IFastCommentsStyles>(() => ({
        ...styles,
        notificationList: {
            ...styles.notificationList,
            centeredView: styles.notificationList?.centeredView ?? { flex: 1 },
            root: {
                ...styles.notificationList?.root,
                margin: 0,
                maxHeight: 440,
                backgroundColor: 'transparent',
                // Web only: the dropdown wrapper provides the shadow; clear the
                // card's own (boxShadow, since react-native-web deprecates shadow*).
                boxShadow: 'none',
            } as ViewStyle,
        },
    }), [styles]);

    if (disableNotificationBell) return null;

    const bellIconType =
        notificationCount > 0
            ? FastCommentsImageAsset.ICON_BELL_RED
            : hasDarkBackground
            ? FastCommentsImageAsset.ICON_BELL_WHITE
            : FastCommentsImageAsset.ICON_BELL;

    return (
        <View>
            <TouchableOpacity
                ref={bellRef}
                testID="notificationBellButton"
                accessibilityLabel="notificationBellButton"
                onPress={() => setNotificationsListOpen(!isOpen)}
                style={styles.notificationBell?.bellContainer}
            >
                <Image source={imageAssets[bellIconType]} style={{ width: 20, height: 20 }} />
                {notificationCount > 0 && (
                    <Text style={styles.notificationBell?.bellCountNonZero}>
                        {notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+'}
                    </Text>
                )}
            </TouchableOpacity>
            {isOpen && (isWebDropdown ? (
                <MentionPortal>
                    <View
                        ref={dropdownRef}
                        testID="notificationListDropdown"
                        style={[dropdownPosition ?? { position: 'absolute', top: 0, left: 0, opacity: 0 }, styles.notificationList?.dropdown]}
                    >
                        <NotificationList
                            imageAssets={imageAssets}
                            onNotificationSelected={onNotificationSelected}
                            store={store}
                            styles={webListStyles}
                            translations={translations}
                        />
                    </View>
                </MentionPortal>
            ) : (
                <View style={styles.notificationList?.centeredView}>
                    <Modal
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setNotificationsListOpen(false)}
                    >
                        <NotificationList
                            imageAssets={imageAssets}
                            onNotificationSelected={onNotificationSelected}
                            store={store}
                            styles={styles}
                            translations={translations}
                        />
                        <TouchableOpacity
                            style={styles.notificationList?.closeButton}
                            onPress={() => setNotificationsListOpen(false)}
                        >
                            <Image
                                source={imageAssets[FastCommentsImageAsset.ICON_CROSS]}
                                style={styles.notificationList?.closeButtonImage}
                            />
                        </TouchableOpacity>
                    </Modal>
                </View>
            ))}
        </View>
    );
}
