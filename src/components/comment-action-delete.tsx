import { Alert } from 'react-native';
import { getActionTenantId } from '../services/tenants';
import { newBroadcastId } from '../services/broadcast-id';
import { createURLQueryString, makeRequest } from '../services/http';
import { removeCommentOnClient } from '../services/remove-comment-on-client';
import { DeleteCommentResponse, RNComment } from '../types';
import { getMergedTranslations } from '../services/translations';
import { showError } from '../services/show-error';
import type { FastCommentsStore } from '../store/types';

export interface CommentActionDeleteProps {
    close: () => void;
    comment: RNComment;
    onError?: (title: string, message: string) => void;
    store: FastCommentsStore;
}

async function deleteComment(
    comment: RNComment,
    store: FastCommentsStore,
    onError?: (title: string, message: string) => void
) {
    const state = store.getState();
    const tenantId = getActionTenantId({ store, tenantId: comment.tenantId });
    const broadcastId = newBroadcastId(store);
    const response = await makeRequest<DeleteCommentResponse>({
        apiHost: state.apiHost,
        method: 'DELETE',
        url:
            '/comments/' +
            tenantId +
            '/' +
            comment._id +
            '/' +
            createURLQueryString({
                urlId: state.config.urlId,
                editKey: comment.editKey,
                sso: state.ssoConfigString,
                broadcastId,
            }),
    });
    if (response.status === 'success') {
        if (response.hardRemoved) {
            removeCommentOnClient(store, comment._id);
        } else {
            store.getState().mergeCommentFields(comment._id, {
                isDeleted: response.comment.isDeleted,
                comment: response.comment.comment,
                commentHTML: response.comment.commentHTML,
                commenterName: response.comment.commenterName,
                userId: response.comment.userId,
            });
        }
    } else {
        const translations = getMergedTranslations(state.translations, response);
        const message =
            response.code === 'edit-key-invalid' ? translations.LOGIN_TO_DELETE : translations.DELETE_FAILURE;
        showError(':(', message, translations.DISMISS, onError);
    }
}

export async function CommentPromptDelete({ comment, store, onError, close }: CommentActionDeleteProps) {
    const translations = store.getState().translations;
    Alert.alert(translations.DELETE_CONFIRM, translations.DELETE_CONFIRMATION_MESSAGE, [
        {
            text: translations.CANCEL,
            onPress: close,
            style: 'cancel',
        },
        {
            text: translations.DELETE_CONFIRM,
            style: 'destructive',
            onPress: async () => {
                try {
                    await deleteComment(comment, store, onError);
                } catch (e) {
                    const t = store.getState().translations;
                    showError(':(', t.DELETE_FAILURE, t.DISMISS, onError);
                }
                close();
            },
        },
    ]);
}
