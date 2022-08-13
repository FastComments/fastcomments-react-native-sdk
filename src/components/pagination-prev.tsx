import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text, View} from "react-native";

export function PaginationPrev(state: FastCommentsState) {
    return <View style={styles.pagination}>
        <Text>{state.translations.PREV_30}</Text>
    </View>;
}

const styles = StyleSheet.create({
    pagination: {
        "marginTop": "50px",
        "lineHeight": "19px",
        "textAlign": "center"
    },
})
