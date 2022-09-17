import {FastCommentsImageAsset, ImageAssetConfig} from "../types";
import {Image, ImageStyle, Text, TextStyle, TouchableOpacity, ViewStyle} from "react-native";
import {useState} from "react";

export interface CheckBoxProps {
    imageStyle?: ImageStyle
    onValueChange: (value: boolean) => void | Promise<void>
    style?: ViewStyle
    text: string
    textStyle?: TextStyle
    imageAssets: ImageAssetConfig
    value: boolean
}

export function CheckBox(props: CheckBoxProps) {
    const [value, setValue] = useState(props.value);
    const imageSrc = props.imageAssets[value ? FastCommentsImageAsset.ICON_CHECKBOX_CHECKED : FastCommentsImageAsset.ICON_CHECKBOX_UNCHECKED];
    return <TouchableOpacity style={props.style} onPress={() => {
        const newValue = !value;
        setValue(newValue);
        props.onValueChange(newValue);
    }
    }>
        <Image source={imageSrc} style={props.imageStyle} />
        <Text style={props.textStyle}>{props.text}</Text>
    </TouchableOpacity>
}
