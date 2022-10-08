import {FastCommentsCommentWithState} from "./comment";
import {Alert} from "react-native";
import {getActionTenantId} from "../services/tenants";
import {newBroadcastId} from "../services/broadcast-id";
import {createURLQueryString, makeRequest} from "../services/http";
import {removeCommentOnClient} from "../services/remove-comment-on-client";
import {DeleteCommentResponse, FastCommentsState, RNComment} from "../types";
import {State} from "@hookstate/core";
import {incChangeCounter} from "../services/comment-render-determination";
import {getMergedTranslations} from "../services/translations";

export interface CommentActionDeleteProps {
    close: () => void;
    comment: RNComment
    state: State<FastCommentsState>
}

async function deleteComment({comment, state}: Pick<FastCommentsCommentWithState, 'comment' | 'state'>) {
    const tenantId = getActionTenantId({state, tenantId: comment.tenantId});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<DeleteCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'DELETE',
        url: '/comments/' + tenantId + '/' + comment._id + '/' + createURLQueryString({
            urlId: state.config.urlId.get(),
            editKey: comment.editKey,
            sso: state.ssoConfigString.get(),
            broadcastId
        })
    });
    if (response.status === 'success') {
        if (response.hardRemoved) {
            removeCommentOnClient(state, state.commentsById[comment._id]);
        } else {
            comment.isDeleted = response.comment.isDeleted;
            comment.comment = response.comment.comment;
            comment.commentHTML = response.comment.commentHTML;
            comment.commenterName = response.comment.commenterName;
            comment.userId = response.comment.userId;
            incChangeCounter(comment);
        }
    } else {
        const translations = getMergedTranslations(state.translations.get({stealth: true}), response);
        const message = response.code === 'edit-key-invalid' ? translations.LOGIN_TO_DELETE : translations.DELETE_FAILURE;
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

export async function CommentPromptDelete({comment, state, close}: CommentActionDeleteProps) {
    Alert.alert(
        state.translations.DELETE_CONFIRM.get(),
        state.translations.DELETE_CONFIRMATION_MESSAGE.get(),
        [
            {
                text: state.translations.CANCEL.get(),
                onPress: close,
                style: 'cancel'
            },
            {
                text: state.translations.DELETE_CONFIRM.get(),
                onPress: async () => {
                    try {
                        await deleteComment({comment, state});
                    } catch (e) {
                        Alert.alert(
                            ":(",
                            state.translations.DELETE_FAILURE.get(),
                            [
                                {
                                    text: state.translations.DISMISS.get()
                                }
                            ]
                        );
                    }
                    close();
                }
            }
        ]
    );
}
