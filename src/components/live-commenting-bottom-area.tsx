import {FastCommentsCallbacks, FastCommentsState} from "../types";
import {View} from "react-native";
import {ReplyArea} from "./reply-area";
import {State, useHookstate} from "@hookstate/core";
import {IFastCommentsStyles} from "../types";
import {ImageAssetConfig, RNComment} from "../types";
import {useState} from "react";

export interface LiveCommentingTopAreaProps extends Pick<FastCommentsCallbacks, 'onAuthenticationChange' | 'onNotificationSelected' | 'onReplySuccess' | 'pickGIF' | 'pickImage'> {
    imageAssets: ImageAssetConfig
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
    translations: Record<string, string>
    callbackObserver: CallbackObserver
}

export interface CallbackObserver {
    replyingTo?: (comment: RNComment | null) => void
}

export function LiveCommentingBottomArea(props: LiveCommentingTopAreaProps) {
    const {
        imageAssets,
        onAuthenticationChange,
        onNotificationSelected,
        onReplySuccess,
        pickGIF,
        pickImage,
        styles,
        translations
    } = props;
    const state = useHookstate(props.state); // OPTIMIZATION: creating scoped state
    const [parentComment, setParentComment] = useState<RNComment | null>();

    props.callbackObserver.replyingTo = (comment) => {
        if (comment) {
            setParentComment(comment);
        } else {
            setParentComment(null);
        }
    }

    return <View style={props.styles.bottomArea?.root}>
        <View>{
            state.config.inputAfterComments.get({stealth: true}) &&
            <View style={props.styles.bottomArea?.replyArea}>
                <ReplyArea
                    imageAssets={imageAssets}
                    onAuthenticationChange={onAuthenticationChange}
                    onNotificationSelected={onNotificationSelected}
                    onReplySuccess={onReplySuccess}
                    parentComment={parentComment}
                    pickGIF={pickGIF}
                    pickImage={pickImage}
                    replyingTo={props.callbackObserver.replyingTo}
                    state={state}
                    styles={styles}
                    translations={translations}
                />
            </View>
        }</View>
    </View>;
}
