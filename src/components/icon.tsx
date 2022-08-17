// @ts-ignore TODO remove
import * as React from 'react';

import {Image} from "react-native";
import {FastCommentsIconType} from "../types/icon";

export function Icon(props: {type: FastCommentsIconType, iconConfig: Record<FastCommentsIconType, string>}) {
    return <Image source={require(`./../resources/icons/${props.iconConfig[props.type]}`)} />
}
