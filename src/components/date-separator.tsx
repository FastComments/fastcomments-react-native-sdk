import { View, Text } from 'react-native';
import { IFastCommentsStyles } from '../types';
import { getDaySeparatorLabel } from '../services/chat-date-separators';

export interface DateSeparatorProps {
    date: string;
    translations: Record<string, string>;
    styles: IFastCommentsStyles;
}

/** Centered day divider rendered between chat messages from different days. */
export function DateSeparator({ date, translations, styles }: DateSeparatorProps) {
    return (
        <View style={styles.comment?.dateSeparator} testID="dateSeparator" accessibilityLabel="dateSeparator">
            <Text style={styles.comment?.dateSeparatorText}>{getDaySeparatorLabel(date, translations)}</Text>
        </View>
    );
}
