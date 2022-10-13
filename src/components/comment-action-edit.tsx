import {FastCommentsCommentWithState} from "./comment";
import {View, Text, ActivityIndicator, Image, TouchableOpacity, Alert} from "react-native";
import {FastCommentsCallbacks, FastCommentsImageAsset} from "../types";
import {useState} from "react";
import {createURLQueryString, makeRequest} from "../services/http";
import {getActionTenantId} from "../services/tenants";
import {UpdateCommentTextResponse} from "../types";
import {newBroadcastId} from "../services/broadcast-id";
import {CommentTextArea, ValueObserver} from "./comment-text-area";
import {FastCommentsState, IFastCommentsStyles, RNComment} from "../types";
import {State} from "@hookstate/core";
import {incChangeCounter} from "../services/comment-render-determination";
import {getMergedTranslations} from "../services/translations";
import { EmoticonBarConfig } from "./wysiwyg/emoticon-bar";

export interface DirtyRef {
    current?: () => boolean
}

export interface CommentActionEditProps extends Pick<FastCommentsCallbacks, 'pickGIF' | 'pickImage'> {
    close: () => void
    comment: RNComment
    isDirtyRef: DirtyRef
    state: State<FastCommentsState>
    styles: IFastCommentsStyles
}

async function saveCommentText({comment, state}: Pick<FastCommentsCommentWithState, 'comment' | 'state'>, newValue: string) {
    const tenantId = getActionTenantId({state, tenantId: comment.tenantId});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<UpdateCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: '/comments/' + tenantId + '/' + comment._id + '/update-text/' + createURLQueryString({
            urlId: state.config.urlId.get(),
            editKey: comment.editKey,
            sso: state.ssoConfigString.get(),
            broadcastId
        }),
        body: {
            comment: newValue,
            // TODO
            // mentions: ???
            // hashTags: ???
        }
    });
    if (response.status === 'success') {
        comment.approved = response.comment.approved;
        comment.comment = response.comment.comment;
        comment.commentHTML = response.comment.commentHTML;
        incChangeCounter(comment);
    } else {
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        const message = response.code === 'edit-key-invalid' ? translations.LOGIN_TO_EDIT : translations.ERROR_MESSAGE;
        Alert.alert(
            ":(",
            message,
            [
                {
                    text: translations.DISMISS
                }
            ]
        );
    }
}

export function CommentActionEdit({
    comment,
    isDirtyRef,
    pickGIF,
    pickImage,
    state,
    styles,
    close
}: CommentActionEditProps) {
    const [isLoading, setLoading] = useState(false);
    const valueGetter: ValueObserver = {};
    isDirtyRef.current = () => {
        if (valueGetter.getValue) {
            return comment.comment !== valueGetter.getValue();
        }
        return false;
    };
    const inlineReactImages = state.config.inlineReactImages.get();
    let emoticonBarConfig: EmoticonBarConfig = {};
    if (inlineReactImages) {
        emoticonBarConfig.emoticons = inlineReactImages.map(function (src) {
            return [src, <Image source={{uri: src}} style={styles.commentTextAreaEmoticonBar?.icon}/>]
        })
    }
    return <View style={styles.commentEditModal?.centeredView}>
        <View style={styles.commentEditModal?.modalView}>
            <CommentTextArea
                emoticonBarConfig={emoticonBarConfig}
                styles={styles}
                state={state.get()}
                value={comment.comment}
                output={valueGetter}
                pickImage={pickImage}
                pickGIF={pickGIF}
            />
            <TouchableOpacity
                style={styles.commentEditModal?.saveButton}
                onPress={async () => {
                    setLoading(true);
                    try {
                        if (valueGetter.getValue) {
                            comment.comment = valueGetter.getValue();
                        }
                        await saveCommentText({comment, state}, comment.comment!);
                        setLoading(false);
                        close();
                    } catch (e) {
                        console.error(e);
                        setLoading(false);
                        Alert.alert(
                            ":(",
                            state.translations.FAILED_TO_SAVE_EDIT.get(),
                            [
                                {
                                    text: state.translations.DISMISS.get()
                                }
                            ]
                        );
                    }
                }}
            >
                <Text style={styles.commentEditModal?.saveButtonText}>{state.translations.SAVE.get()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.commentEditModal?.modalCancel}
                onPress={close}
            >
                {<Image
                    source={state.imageAssets.get()[state.config.hasDarkBackground.get() ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                    style={{width: 16, height: 16}}/>}
            </TouchableOpacity>
            {
                isLoading && <View style={styles.commentEditModal?.loadingView}>
                    <ActivityIndicator size="large"/>
                </View>
            }
        </View>
    </View>;
}
