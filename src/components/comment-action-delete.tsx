import {FastCommentsCommentWithState} from "./comment";
import {Alert} from "react-native";
import {getActionTenantId} from "../services/tenants";
import {newBroadcastId} from "../services/broadcast-id";
import {createURLQueryString, makeRequest} from "../services/http";
import {DeleteCommentResponse} from "../types/dto/delete-comment";
import {removeCommentOnClient} from "../services/remove-comment-on-client";

export interface CommentActionDeleteProps extends FastCommentsCommentWithState {
    close: () => void;
}

async function deleteComment({comment, state}: FastCommentsCommentWithState) {
    const tenantId = getActionTenantId({comment, state});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<DeleteCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'DELETE',
        url: '/comments/' + tenantId + '/' + comment._id + '/' + createURLQueryString({
            urlId: state.config.urlId.get(),
            editKey: state.commentState[comment._id.get()]?.editKey.get(),
            sso: state.ssoConfigString.get(),
            broadcastId
        })
    });
    if (response.status === 'success') {
        if (response.hardRemoved) {
            console.log(state.commentsTree.length);
            removeCommentOnClient({comment, state});
            console.log(state.commentsTree.length);
        } else {
            comment.merge({
                isDeleted: response.comment.isDeleted,
                comment: response.comment.comment,
                commentHTML: response.comment.commentHTML,
                commenterName: response.comment.commenterName,
                userId: response.comment.userId,
            });
        }
    } else {
        // TODO error handling
        // TODO handle code 'edit-key-invalid')
    }
}

export async function CommentPromptDelete({comment, state, close}: CommentActionDeleteProps) {
    Alert.alert(
        state.translations.DELETE_CONFIRM.get(),
        state.translations.DELETE_CONFIRMATION_MESSAGE.get(),
        [
            {
                text: state.translations.CANCEL.get(),
                onPress: close,
                style: "cancel" // TODO what does this do
            },
            {
                text: state.translations.DELETE_CONFIRM.get(),
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
