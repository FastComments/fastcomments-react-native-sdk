import {FastCommentsCommentWithState} from "./comment";
import {Alert} from "react-native";
import {getActionTenantId} from "../services/tenants";
import {newBroadcastId} from "../services/broadcast-id";
import {createURLQueryString, makeRequest} from "../services/http";
import {DeleteCommentResponse} from "../types/dto/delete-comment";
import {removeComment} from "../services/remove-comment";

export interface CommentActionDeleteProps extends FastCommentsCommentWithState {
    close: () => void;
}

async function deleteComment({comment, state}: FastCommentsCommentWithState) {
    const tenantId = getActionTenantId({comment, state});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<DeleteCommentResponse>({
        apiHost: state.apiHost,
        method: 'DELETE',
        url: '/comments/' + tenantId + '/' + comment._id + '/' + createURLQueryString({
            urlId: state.config.urlId,
            editKey: state.commentState[comment._id]?.editKey,
            sso: state.ssoConfigString,
            broadcastId
        })
    });
    if (response.status === 'success') {
        if (response.hardRemoved) {
            removeComment({comment, state});
            state.render();
        } else {
            comment.isDeleted = response.comment.isDeleted;
            comment.comment = response.comment.comment;
            comment.commentHTML = response.comment.commentHTML;
            comment.commenterName = response.comment.commenterName;
            comment.userId = response.comment.userId;
        }
    } else {
        // TODO error handling
        // TODO handle code 'edit-key-invalid')
    }
}

export async function CommentPromptDelete({comment, state, close}: CommentActionDeleteProps) {
    Alert.alert(
        state.translations.DELETE_CONFIRM,
        state.translations.DELETE_CONFIRMATION_MESSAGE,
        [
            {
                text: state.translations.CANCEL,
                onPress: close,
                style: "cancel" // TODO what does this do
            },
            {
                text: state.translations.DELETE_CONFIRM,
                onPress: async () => {
                    try {
                        await deleteComment({comment, state});
                    } catch (e) {
                        // TODO handle failures
                    }
                    close();
                }
            }
        ]
    );
}
