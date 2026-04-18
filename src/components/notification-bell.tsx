import { Image, View, Text, TouchableOpacity, Modal } from 'react-native';
import { FastCommentsImageAsset, ImageAssetConfig } from '../types';
import { useState } from 'react';
import { IFastCommentsStyles } from '../types';
import { NotificationList } from './notification-list';
import { FastCommentsCallbacks } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

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
                onPress={() => setNotificationsListOpen(!isOpen)}
                style={styles.notificationBell?.bellContainer}
            >
                <Image source={imageAssets[bellIconType]} style={{ width: 20, height: 20 }} />
                <Text
                    style={
                        notificationCount > 0
                            ? styles.notificationBell?.bellCountNonZero
                            : styles.notificationBell?.bellCount
                    }
                >
                    {notificationCount < 100 ? Number(notificationCount).toLocaleString() : '99+'}
                </Text>
            </TouchableOpacity>
            {isOpen && (
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
            )}
        </View>
    );
}
