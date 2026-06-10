import { getActionTenantId } from '../services/tenants';
import { showConfirmDialog } from '../services/dialogs';
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
    showConfirmDialog({
        title: translations.DELETE_CONFIRM,
        message: translations.DELETE_CONFIRMATION_MESSAGE,
        confirmText: translations.DELETE_CONFIRM,
        cancelText: translations.CANCEL,
        destructive: true,
        onCancel: close,
        onConfirm: () => {
            void (async () => {
                try {
                    await deleteComment(comment, store, onError);
                } catch (e) {
                    const t = store.getState().translations;
                    showError(':(', t.DELETE_FAILURE, t.DISMISS, onError);
                }
                close();
            })();
        },
    });
}
