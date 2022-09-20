// @ts-ignore TODO remove
import * as React from 'react';
import {useEffect, useState} from 'react';
import {ActivityIndicator, FlatList, ListRenderItemInfo, useWindowDimensions, View} from "react-native";
import {RenderHTMLConfigProvider, TRenderEngineProvider} from "react-native-render-html";
import {
    FastCommentsCallbacks,
    FastCommentsState,
    GetUserNotificationsResponse,
    IFastCommentsStyles,
    ImageAssetConfig,
    UserNotification
} from "../types";
import {CommonHTTPResponse, createURLQueryString, makeRequest} from "../services/http";
import {GetTranslationsResponse} from "../types/dto/get-translations-response";
import {NotificationListItem, NotificationListItemProps} from "./notification-list-item";
import {getDefaultAvatarSrc} from "../services/default-avatar";
import {CheckBox} from "./checkbox";

export interface NotificationListProps extends Pick<FastCommentsCallbacks, 'onNotificationSelected'> {
    imageAssets: ImageAssetConfig
    state: FastCommentsState
    styles: IFastCommentsStyles
    translations: Record<string, string>
}

const NotificationListItemMemo = React.memo<NotificationListItemProps>(
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

async function getNotificationTranslations(apiHost: string, locale?: string) {
    let url = '/translations/widgets/comment-ui-notifications-list?useFullTranslationIds=true';
    if (locale) {
        url += '&locale=' + locale;
    }
    const response = await makeRequest<GetTranslationsResponse>({
        apiHost,
        method: 'GET',
        url
    });
    if (!response.translations) { // note - makeRequest will already do retries, so ideally this never happens or is very rare.
        throw Error('Could not get notifications list translations!');
    }
    return response.translations;
}

async function getNextNotificationsState(apiHost: string, tenantId: string, urlId: string, ssoConfigString: string | null | undefined, afterId?: string) {
    return await makeRequest<GetUserNotificationsResponse>({
        apiHost,
        method: 'GET',
        url: '/user-notifications' + createURLQueryString({
            tenantId,
            urlId, // for notification subscription state
            sso: ssoConfigString,
            afterId
        })
    });
}

async function changeSubscriptionState(
    apiHost: string,
    tenantId: string,
    urlId: string,
    url: string | undefined,
    pageTitle: string | undefined,
    ssoConfigString: string | null | undefined,
    isSubscribed: boolean
) {
    await makeRequest<CommonHTTPResponse>({
        apiHost,
        method: 'POST',
        url: '/user-notifications/set-subscription-state/' + (isSubscribed ? 'subscribe' : 'unsubscribe') + '/' + createURLQueryString({
            tenantId,
            urlId,
            url,
            pageTitle,
            sso: ssoConfigString
        })
    });
    // TODO check response and update checkbox if failed
}

export function NotificationList({imageAssets, onNotificationSelected, state, styles, translations}: NotificationListProps) {
    const [isLoading, setLoading] = useState(true);
    const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
    const [notificationTranslations, setNotificationTranslations] = useState<Record<string, string>>({});
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
    const {width} = useWindowDimensions();

    const loadAsync = async () => {
        setLoading(true);
        const [notificationTranslations, notificationsState] = await Promise.all([
            getNotificationTranslations(state.apiHost, state.config.locale),
            getNextNotificationsState(state.apiHost, state.config.tenantId, state.config.urlId!, state.ssoConfigString),
        ]);
        setNotificationTranslations(notificationTranslations);
        setNotifications(notificationsState.notifications);
        setIsSubscribed(notificationsState.isSubscribed);
        setLoading(false);
    }
    useEffect(() => {
        loadAsync();
    }, []);

    if (isLoading) {
        return <View><ActivityIndicator size="small"/></View>
    }

    const subscribeHeader = <View style={styles.notificationList?.subscriptionHeader}>
        <CheckBox
            imageAssets={imageAssets}
            imageStyle={styles.notificationList?.subscriptionHeaderCheckBoxImage}
            onValueChange={(value: boolean) => {
                (async function () {
                    await changeSubscriptionState(
                        state.apiHost,
                        state.config.tenantId,
                        state.config.urlId!,
                        state.config.url,
                        state.config.pageTitle,
                        state.ssoConfigString,
                        value
                    );
                    setIsSubscribed(value);
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
        const notificationsState = await getNextNotificationsState(state.apiHost, state.config.tenantId, state.config.urlId!, state.ssoConfigString, notifications[notifications.length - 1]?._id);
        setNotifications([
            ...notifications,
            ...notificationsState.notifications
        ]);
        setIsSubscribed(notificationsState.isSubscribed);
        setIsFetchingNextPage(false);
    }

    const renderItem = (info: ListRenderItemInfo<UserNotification>) =>
        <NotificationListItemMemo
            apiHost={state.apiHost}
            config={state.config}
            defaultAvatar={getDefaultAvatarSrc(imageAssets)}
            imageAssets={imageAssets}
            notification={info.item}
            notificationTranslations={notificationTranslations}
            onNotificationSelected={onNotificationSelected}
            ssoConfigString={state.ssoConfigString}
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
