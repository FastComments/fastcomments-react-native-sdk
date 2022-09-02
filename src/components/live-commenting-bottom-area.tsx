// @ts-ignore TODO remove
import * as React from 'react';

import {FastCommentsState} from "../types/fastcomments-state";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {State, useHookstate} from "@hookstate/core";
import {IFastCommentsStyles} from "../types/fastcomments-styles";

export interface LiveCommentingTopAreaProps {
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

export function LiveCommentingBottomArea(props: LiveCommentingTopAreaProps) {
    const {styles} = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    return <View>
        <View>{
            state.config.inputAfterComments.get() && <View style={props.styles.bottomArea?.replyArea}><ReplyArea state={state} styles={styles}/></View>
        }</View>
    </View>;
}
