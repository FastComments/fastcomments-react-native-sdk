import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, View, Text, Pressable, ActivityIndicator, Image} from "react-native";
import {FastCommentsImageAsset} from "../types/image-asset";
import {useState} from "react";
import {createURLQueryString, makeRequest} from "../services/http";
import {getActionTenantId} from "../services/tenants";
import {UpdateCommentTextResponse} from "../types/dto/update-comment-text";
import {newBroadcastId} from "../services/broadcast-id";
import {CommentTextArea} from "./comment-text-area";

export interface CommentActionEditProps extends FastCommentsCommentWithState {
    close: () => void;
}

async function saveCommentText({comment, state}: FastCommentsCommentWithState, newValue: string) {
    const tenantId = getActionTenantId({state, tenantId: comment.tenantId.get()});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<UpdateCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: '/comments/' + tenantId + '/' + comment._id + '/update-text/' + createURLQueryString({
            urlId: state.config.urlId.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get(),
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

export function CommentActionEdit({comment, state, close}: CommentActionEditProps) {
    const [isLoading, setLoading] = useState(false);
    // TODO common comment writing component
    // TODO ask before closing if content changed
    return <View style={styles.centeredView}>
        <View style={styles.modalView}>
            <CommentTextArea state={state} value={comment.comment.get()} onChangeText={(newValue: string) => comment.comment.set(newValue)} />
            <Pressable
                style={styles.saveButton}
                onPress={async () => {
                    setLoading(true);
                    try {
                        await saveCommentText({comment, state}, comment.comment.get()!);
                        setLoading(false);
                        close();
                    } catch (e) {
                        setLoading(false);
                        // TODO show err message
                    }
                }}
            >
                <Text>{state.translations.SAVE.get()}</Text>
            </Pressable>
            <Pressable
                style={styles.modalCancel}
                onPress={close}
            >
                {<Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_CROSS]} style={{width: 16, height: 16}} />}
            </Pressable>
            {
                isLoading && <View style={styles.loadingView}>
                    <ActivityIndicator size="large"/>
                </View>
            }
        </View>
    </View>;
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
    },
    modalView: {
        minWidth: 300,
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        paddingTop: 35,
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: 20,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalCancel: {
        position: 'absolute',
        top: 10,
        right: 10
    },
    loadingView: {
        // TODO common
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff80'
    },
    saveButton: {
        marginTop: 10
    }
});
