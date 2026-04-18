import { Text, TextStyle, View } from 'react-native';
import { useMemo } from 'react';
import { getPrettyDate } from '../services/pretty-date';
import { useRelativeTimeTick } from '../services/relative-time-ticker';

export interface CommentDisplayDateProps {
    date: string;
    translations: Record<string, string>;
    style?: TextStyle;
    absoluteDateStyle?: TextStyle;
    absoluteDates?: boolean;
    absoluteAndRelativeDates?: boolean;
}

export function CommentDisplayDate({
    date,
    translations,
    absoluteDates,
    absoluteAndRelativeDates,
    style,
    absoluteDateStyle,
}: CommentDisplayDateProps) {
    const dateObj = useMemo(() => new Date(date), [date]);

    // Subscribe to the shared 60s ticker so only the components that actually
    // render a relative date re-render once per minute. Absolute-only renders don't subscribe.
    const tick = useRelativeTimeTick();
    const prettyDate = useMemo(() => {
        if (absoluteDates) return '';
        void tick;
        return getPrettyDate(translations, dateObj.valueOf());
    }, [dateObj, translations, tick, absoluteDates]);

    if (absoluteDates) {
        return <Text style={style}>{dateObj.toLocaleDateString()}</Text>;
    }
    if (absoluteAndRelativeDates) {
        return (
            <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, style]}>
                <Text style={style}>{prettyDate}</Text>
                <Text style={[style, absoluteDateStyle]}>({dateObj.toLocaleDateString()})</Text>
            </View>
        );
    }
    return <Text style={style}>{prettyDate}</Text>;
}
