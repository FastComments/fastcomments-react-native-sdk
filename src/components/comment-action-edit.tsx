import {FastCommentsCommentWithState} from "./comment";
import {View, Text, ActivityIndicator, Image, TouchableOpacity} from "react-native";
import {FastCommentsImageAsset} from "../types/image-asset";
import {useState} from "react";
import {createURLQueryString, makeRequest} from "../services/http";
import {getActionTenantId} from "../services/tenants";
import {UpdateCommentTextResponse} from "../types/dto/update-comment-text";
import {newBroadcastId} from "../services/broadcast-id";
import {CommentTextArea, ValueObserver} from "./comment-text-area";

export interface CommentActionEditProps extends FastCommentsCommentWithState {
    close: () => void;
}

async function saveCommentText({comment, state}: Pick<FastCommentsCommentWithState, 'comment' | 'state'>, newValue: string) {
    const tenantId = getActionTenantId({state, tenantId: comment.tenantId.get()});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<UpdateCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: '/comments/' + tenantId + '/' + comment._id.get() + '/update-text/' + createURLQueryString({
            urlId: state.config.urlId.get(),
            editKey: comment.editKey.get(),
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
        comment.merge({
            approved: response.comment.approved,
            comment: response.comment.comment,
            commentHTML: response.comment.commentHTML,
        });
    } else {
        // TODO error handling
        // TODO handle code 'edit-key-invalid')
    }
}

export function CommentActionEdit({comment, state, styles, close}: CommentActionEditProps) {
    const [isLoading, setLoading] = useState(false);
    const valueGetter: ValueObserver = {}
    // TODO ask before closing if content changed
    return <View style={styles.commentEditModal.centeredView}>
        <View style={styles.commentEditModal.modalView}>
            <CommentTextArea
                state={state.get()} value={comment.comment.get()}
                styles={styles}
                output={valueGetter}
            />
            <TouchableOpacity
                style={styles.commentEditModal.saveButton}
                onPress={async () => {
                    setLoading(true);
                    try {
                        valueGetter.getValue && comment.comment.set(valueGetter.getValue());
                        await saveCommentText({comment, state}, comment.comment.get()!);
                        setLoading(false);
                        close();
                    } catch (e) {
                        console.error(e);
                        setLoading(false);
                        // TODO show err message
                    }
                }}
            >
                <Text>{state.translations.SAVE.get()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.commentEditModal.modalCancel}
                onPress={close}
            >
                {<Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_CROSS]} style={{width: 16, height: 16}} />}
            </TouchableOpacity>
            {
                isLoading && <View style={styles.commentEditModal.loadingView}>
                    <ActivityIndicator size="large"/>
                </View>
            }
        </View>
    </View>;
}
