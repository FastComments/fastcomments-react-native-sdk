import {memo} from 'react';
import {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, ListRenderItemInfo, Text, useWindowDimensions, View} from "react-native";
import {RenderHTMLConfigProvider, TRenderEngineProvider} from "react-native-render-html";
import {
    FastCommentsCallbacks,
    IFastCommentsStyles,
    ImageAssetConfig,
    UserNotification,
    UserNotificationTranslations,
} from "../types";
import {NotificationListItem, NotificationListItemProps} from "./notification-list-item";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {CheckBox} from "./checkbox";
import {changePageSubscriptionStateForUser, getNotificationTranslations, getUserNotifications} from "../services/notifications";
import {getMergedTranslations} from "../services/translations";
import {showError} from "../services/show-error";
import type { FastCommentsStore } from "../store/types";
import { useStoreValue } from "../store/hooks";

export interface NotificationListProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected' | 'onError'> {
    imageAssets: ImageAssetConfig
    store: FastCommentsStore
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

const NotificationListItemMemo = memo<NotificationListItemProps>(
    props => NotificationListItem(props),
    (prevProps, nextProps) => {
        if (prevProps.notification.viewed !== nextProps.notification.viewed) {
            return false;
        }
        if (prevProps.notification.optedOut !== nextProps.notification.optedOut) {
            return false;
        }
        return true;
    }
);

export function NotificationList({imageAssets, onError, onNotificationSelected, store, styles, translations}: NotificationListProps) {
    const config = useStoreValue(store, (s) => s.config);
    const [isLoading, setLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [notificationTranslations, setNotificationTranslations] = useState<Record<UserNotificationTranslations, string>>();
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
    const [loadFailed, setLoadFailed] = useState<boolean>(false);
    const {width} = useWindowDimensions();

    const loadAsync = async () => {
        setLoading(true);
        setLoadFailed(false);
        try {
            const [notificationTranslationsResponse, notificationsState] = await Promise.all([
                getNotificationTranslations(store),
                getUserNotifications({
                    store
                }),
            ]);
            setNotificationTranslations(notificationTranslationsResponse.translations!);
            setNotifications(notificationsState.notifications);
            setIsSubscribed(notificationsState.isSubscribed);
        } catch (e) {
            // An unauthenticated/expired session 401s here; never spin forever.
            console.error('Failed to load notifications', e);
            setLoadFailed(true);
        }
        setLoading(false);
    }
    useEffect(() => {
        loadAsync();
    }, []);

    if (isLoading) {
        return <View><ActivityIndicator size="small"/></View>
    }

    if (loadFailed) {
        return (
            <View testID="notificationsLoadFailed" accessibilityLabel="notificationsLoadFailed">
                <Text style={styles.notificationList?.notificationDate}>{translations.ERROR_MESSAGE}</Text>
            </View>
        );
    }

    const subscribeHeader = notificationTranslations && <View style={styles.notificationList?.subscriptionHeader}>
        <CheckBox
            imageAssets={imageAssets}
            imageStyle={styles.notificationList?.subscriptionHeaderCheckBoxImage}
            onValueChange={(value: boolean) => {
                (async function () {
                    const response = await changePageSubscriptionStateForUser({
                        store,
                        isSubscribed: value
                    });
                    if (response.status === 'success') {
                        setIsSubscribed(value);
                    } else {
                        const mergedTranslations = getMergedTranslations(translations, response);
                        showError(':(', mergedTranslations.ERROR_MESSAGE, mergedTranslations.DISMISS, onError);
                    }
                })();
            }}
            style={styles.notificationList?.subscriptionHeaderCheckBox}
            text={notificationTranslations.SUBSCRIBE_TO_THIS_PAGE}
            value={isSubscribed}
            textStyle={styles.notificationList?.subscriptionHeaderCheckBoxText}
        />
    </View>;

    const footerLoadingIndicator = <View>
        {
            isFetchingNextPage
                ? <ActivityIndicator size="small"/>
                : null
        }
    </View>;

    const onEndReached = async ({distanceFromEnd}: { distanceFromEnd: number }) => {
        if (distanceFromEnd < 0 || notifications.length < 20) {
            return;
        }
        setIsFetchingNextPage(true);
        const notificationsState = await getUserNotifications({
            store,
            afterId: notifications[notifications.length - 1]?._id
        });
        setNotifications([
            ...notifications,
            ...notificationsState.notifications
        ]);
        setIsSubscribed(notificationsState.isSubscribed);
        setIsFetchingNextPage(false);
    }

    const renderItem = (info: ListRenderItemInfo<UserNotification>) =>
        <NotificationListItemMemo
            config={config}
            defaultAvatar={getDefaultAvatarSrc(imageAssets)}
            imageAssets={imageAssets}
            notification={info.item}
            notificationTranslations={notificationTranslations!}
            onNotificationSelected={onNotificationSelected}
            store={store}
            styles={styles}
            translations={translations}
            width={width}
        />;

    return <View style={styles.notificationList?.root}>
        <TRenderEngineProvider baseStyle={styles.notificationList?.notificationText}>
            <RenderHTMLConfigProvider><FlatList
                data={notifications}
                keyExtractor={notification => notification._id}
                maxToRenderPerBatch={30}
                onEndReachedThreshold={0.3}
                onEndReached={onEndReached}
                renderItem={renderItem}
                ListHeaderComponent={subscribeHeader}
                ListFooterComponent={footerLoadingIndicator}
            /></RenderHTMLConfigProvider>
        </TRenderEngineProvider>
    </View>
}
