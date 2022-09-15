import {Text, TextStyle, View} from "react-native";
import {useEffect, useState} from "react";
import {getPrettyDate} from "../services/pretty-date";

export interface CommentDisplayDateProps {
    date: string
    translations: Record<string, string>
    style?: TextStyle
    absoluteDateStyle?: TextStyle
    absoluteDates?: boolean
    absoluteAndRelativeDates?: boolean
}

export function CommentDisplayDate({date, translations, absoluteDates, absoluteAndRelativeDates, style, absoluteDateStyle}: CommentDisplayDateProps) {
    const dateObj = new Date(date);
    const [prettyDate, setPrettyDate] = useState(getPrettyDate(translations, dateObj.valueOf()));

    // Technically having a separate timer per comment is not optimal. But, JS timers are very light and we'll only render 30 comments most of the time.
    // It would be cool to have only one timer, like in the VanillaJS library.
    useEffect(() => {
        const interval = setInterval(function () {
            if (!absoluteDates) {
                setPrettyDate(getPrettyDate(translations, dateObj.valueOf()));
            }
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    if (absoluteDates) {
        return <Text style={style}>{dateObj.toLocaleDateString()}</Text>;
    } else {
        if (absoluteAndRelativeDates) {
            return <View style={[{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, style]}>
                <Text style={style}>{prettyDate}</Text>;
                <Text style={[style, absoluteDateStyle]}>({dateObj.toLocaleDateString()})</Text>;
            </View>;
        } else {
            return <Text style={style}>{prettyDate}</Text>;
        }
    }
}
