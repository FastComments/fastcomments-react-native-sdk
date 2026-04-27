import { Alert } from 'react-native';
import { getActionTenantId } from '../services/tenants';
import { newBroadcastId } from '../services/broadcast-id';
import { removeCommentOnClient } from '../services/remove-comment-on-client';
import { RNComment } from '../types';
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
    const sdk = state.sdk;
    const response = await sdk.publicApi.deleteCommentPublic({
        tenantId,
        commentId: comment._id,
        broadcastId,
        editKey: comment.editKey,
        sso: state.ssoConfigString,
    });
    if (response.status === 'success') {
        if (response.hardRemoved) {
            removeCommentOnClient(store, comment._id);
        } else if (response.comment) {
            store.getState().mergeCommentFields(comment._id, {
                isDeleted: response.comment.isDeleted,
                commentHTML: response.comment.commentHTML,
                commenterName: response.comment.commenterName,
                userId: response.comment.userId ?? undefined,
            });
        }
    } else {
        const translations = state.translations;
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
