// @ts-ignore TODO remove
import * as React from 'react';

import {Image} from "react-native";
import {FastCommentsImageAsset} from "../types/image-asset";

export function Icon(props: {type: FastCommentsImageAsset, iconConfig: Record<FastCommentsImageAsset, string>}) {
    return <Image source={require(`./../resources/icons/${props.iconConfig[props.type]}`)} />
}
