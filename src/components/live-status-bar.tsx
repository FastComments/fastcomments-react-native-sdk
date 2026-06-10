import { Text, View } from 'react-native';
import { IFastCommentsStyles } from '../types';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface LiveStatusBarProps {
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

export function LiveStatusBar({ store, styles }: LiveStatusBarProps) {
    const wsConnected = useStoreValue(store, (s) => s.wsConnected);
    const subscriberCount = useStoreValue(store, (s) => s.subscriberCount);
    const translations = useStoreValue(store, (s) => s.translations);

    const statusText = wsConnected ? translations.LIVE : translations.DISCONNECTED;
    const userCountTemplate = subscriberCount === 1 ? translations.USER_ONLINE : translations.USERS_ONLINE;
    const userCountString = userCountTemplate
        ? userCountTemplate.replace('[count]', String(subscriberCount))
        : undefined;

    const bar = styles.liveStatusBar;

    return (
        <View style={bar?.root}>
            <View
                style={[
                    bar?.connectionChip,
                    wsConnected ? bar?.connectionChipConnected : bar?.connectionChipDisconnected,
                ]}
            >
                <View
                    testID="connectionDot"
                    accessibilityLabel="connectionDot"
                    style={[
                        bar?.connectionDot,
                        wsConnected ? bar?.connectionDotConnected : bar?.connectionDotDisconnected,
                    ]}
                />
                <Text
                    testID="connectionStatusText"
                    accessibilityLabel="connectionStatusText"
                    style={bar?.connectionText}
                >
                    {statusText}
                </Text>
            </View>
            {subscriberCount > 1 && userCountString !== undefined ? (
                <View style={bar?.userCountChip}>
                    <Text
                        testID="userCountText"
                        accessibilityLabel="userCountText"
                        style={bar?.userCountText}
                    >
                        {userCountString}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}
