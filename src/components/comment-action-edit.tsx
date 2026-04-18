import { View, Text, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { FastCommentsCallbacks, FastCommentsImageAsset } from '../types';
import { useState } from 'react';
import { createURLQueryString, makeRequest } from '../services/http';
import { getActionTenantId } from '../services/tenants';
import { UpdateCommentTextResponse } from '../types';
import { newBroadcastId } from '../services/broadcast-id';
import {
    CommentTextArea10Tap as CommentTextArea,
    ValueObserver,
    EmoticonBarConfig,
} from './comment-text-area-10tap';
import { IFastCommentsStyles, RNComment } from '../types';
import { getMergedTranslations } from '../services/translations';
import { showError } from '../services/show-error';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface DirtyRef {
    current?: () => boolean;
}

export interface CommentActionEditProps extends Pick<FastCommentsCallbacks, 'pickGIF' | 'pickImage' | 'onError'> {
    close: (safe: boolean) => void;
    comment: RNComment;
    isDirtyRef: DirtyRef;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
}

async function saveCommentText(
    comment: RNComment,
    store: FastCommentsStore,
    newValue: string,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const tenantId = getActionTenantId({ store, tenantId: comment.tenantId });
    const broadcastId = newBroadcastId();
    const response = await makeRequest<UpdateCommentTextResponse>({
        apiHost: state.apiHost,
        method: 'POST',
        url:
            '/comments/' +
            tenantId +
            '/' +
            comment._id +
            '/update-text/' +
            createURLQueryString({
                urlId: state.config.urlId,
                editKey: comment.editKey,
                sso: state.ssoConfigString,
                broadcastId,
            }),
        body: {
            comment: newValue,
        },
    });
    if (response.status === 'success') {
        store.getState().mergeCommentFields(comment._id, {
            approved: response.comment.approved,
            comment: response.comment.comment,
            commentHTML: response.comment.commentHTML,
        });
    } else {
        const translations = getMergedTranslations(state.translations, response);
        const message =
            response.code === 'edit-key-invalid' ? translations.LOGIN_TO_EDIT : translations.ERROR_MESSAGE;
        showError(':(', message, translations.DISMISS, onError);
    }
}

export function CommentActionEdit({
    comment,
    isDirtyRef,
    onError,
    pickGIF,
    pickImage,
    store,
    styles,
    close,
}: CommentActionEditProps) {
    const [isLoading, setLoading] = useState(false);
    const valueGetter: ValueObserver = {};
    isDirtyRef.current = () => {
        if (valueGetter.getValue) {
            return comment.comment !== valueGetter.getValue();
        }
        return false;
    };
    const inlineReactImages = useStoreValue(store, (s) => s.config.inlineReactImages);
    const translations = useStoreValue(store, (s) => s.translations);
    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const hasDarkBackground = useStoreValue(store, (s) => !!s.config.hasDarkBackground);

    const emoticonBarConfig: EmoticonBarConfig = {};
    if (inlineReactImages) {
        emoticonBarConfig.emoticons = inlineReactImages.map((src: string) => [
            src,
            <Image source={{ uri: src }} style={styles.commentTextAreaEmoticonBar?.icon} />,
        ]);
    }
    return (
        <View style={styles.commentEditModal?.centeredView}>
            <View style={styles.commentEditModal?.modalView}>
                <CommentTextArea
                    emoticonBarConfig={emoticonBarConfig}
                    styles={styles}
                    store={store}
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
                            if (valueGetter.getValue) comment.comment = valueGetter.getValue();
                            await saveCommentText(comment, store, comment.comment!, onError);
                            setLoading(false);
                            close(true);
                        } catch (e) {
                            console.error(e);
                            setLoading(false);
                            showError(':(', translations.FAILED_TO_SAVE_EDIT, translations.DISMISS, onError);
                        }
                    }}
                >
                    <Text style={styles.commentEditModal?.saveButtonText}>{translations.SAVE}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentEditModal?.modalCancel} onPress={() => close(false)}>
                    <Image
                        source={
                            imageAssets[
                                hasDarkBackground
                                    ? FastCommentsImageAsset.ICON_CROSS_WHITE
                                    : FastCommentsImageAsset.ICON_CROSS
                            ]
                        }
                        style={{ width: 16, height: 16 }}
                    />
                </TouchableOpacity>
                {isLoading && (
                    <View style={styles.commentEditModal?.loadingView}>
                        <ActivityIndicator size="large" />
                    </View>
                )}
            </View>
        </View>
    );
}
