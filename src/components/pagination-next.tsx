import {FastCommentsState} from "../types/fastcomments-state";
import {StyleSheet, Text, View} from "react-native";

export function PaginationNext(state: FastCommentsState) {
    const shouldShowPagination = state.page !== -1 && state.commentCountOnClient > state.PAGE_SIZE && state.hasMore;
    if (shouldShowPagination) {
        // TODO: check if loading, set opacity: 0.5
        // TODO: these translations contain HTML, define new ones?
        return <View style={styles.pagination}>
            <Text style={styles.all}>{state.translations.NEXT_30}</Text>
            {
                state.commentCountOnServer < 2000 && <Text
                    style={styles.all}>{(state.translations.LOAD_ALL || '').replace('[count]', Number(state.commentCountOnServer).toLocaleString())}</Text>
            }
        </View>;
    }
    return null;
}

const styles = StyleSheet.create({
    pagination: {
        "marginTop": "50px",
        "lineHeight": "19px",
        "textAlign": "center"
    },
    next: {
    },
    all: {}
});
