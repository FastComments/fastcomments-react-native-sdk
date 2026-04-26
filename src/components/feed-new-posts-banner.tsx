import { Text, TouchableOpacity, View } from 'react-native';
import type { IFastCommentsStyles } from '../types';

export interface FeedNewPostsBannerProps {
    count: number;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
    onPress: () => void;
}

export function FeedNewPostsBanner({ count, translations, styles, onPress }: FeedNewPostsBannerProps) {
    if (count <= 0) return null;
    const template =
        count === 1
            ? translations.FEED_NEW_POST_BANNER
            : translations.FEED_NEW_POST_BANNER_PLURAL;
    const label = template ? template.replace('[count]', String(count)) : '';
    return (
        <View>
            <TouchableOpacity
                testID="newPostsBanner"
                accessibilityLabel="newPostsBanner"
                style={styles.feed?.newPostsBanner}
                onPress={onPress}
            >
                <Text style={styles.feed?.newPostsBannerText}>{label}</Text>
            </TouchableOpacity>
        </View>
    );
}
