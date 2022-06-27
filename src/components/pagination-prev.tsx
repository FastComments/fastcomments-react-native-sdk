import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text} from "react-native";

export function PaginationPrev(state: FastCommentsState) {
    return <div style={styles.pagination}>
        <Text>{state.translations.PREV_30}</Text>
    </div>;
}

const styles = StyleSheet.create({
    pagination: {
        "marginTop": "50px",
        "lineHeight": "19px",
        "textAlign": "center"
    },
})
