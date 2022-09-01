import {FastCommentsCommentWithState} from "./comment";
import {useHookstate} from "@hookstate/core";
import {Text, TextStyle, View} from "react-native";
import {useState} from "react";
import {getPrettyDate} from "../services/pretty-date";

export interface CommentDisplayDateProps extends FastCommentsCommentWithState {
    style?: TextStyle
    absoluteDateStyle?: TextStyle
}

export function CommentDisplayDate(props: CommentDisplayDateProps) {
    const comment = props.comment;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state

    const dateObj = new Date(comment.date.get());
    const [prettyDate, setPrettyDate] = useState(getPrettyDate(state.translations.get(), dateObj.valueOf()));

    if (state.config.absoluteDates.get()) {
        return <Text style={props.style}>{dateObj.toLocaleDateString()}</Text>;
    } else {
        // Technically having a separate timer per comment is not optimal. But, JS timers are very light and we'll only render 30 comments most of the time.
        // It would be cool to have only one timer, like in the VanillaJS library.
        setInterval(function () {
            setPrettyDate(getPrettyDate(state.translations.get(), dateObj.valueOf()));
        }, 60_000);
        if (state.config.absoluteAndRelativeDates.get()) {
            return <View style={[{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, props.style]}>
                <Text style={props.style}>{prettyDate}</Text>;
                <Text style={[props.style, props.absoluteDateStyle]}>({dateObj.toLocaleDateString()})</Text>;
            </View>;
        } else {
            return <Text style={props.style}>{prettyDate}</Text>;
        }
    }
}
