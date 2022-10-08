import {View} from "react-native";
import {IFastCommentsStyles} from "../types";

export interface ThreeDotProps {
    styles: IFastCommentsStyles
}

export function ThreeDot({styles}: ThreeDotProps) {
    return <View style={styles.threeDotMenu?.dots}>
        <View style={styles.threeDotMenu?.dot}/>
        <View style={styles.threeDotMenu?.dot}/>
        <View style={styles.threeDotMenu?.dot}/>
    </View>
}
