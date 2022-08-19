import {FastCommentsCommentWithState} from "./comment";
import {StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator} from "react-native";
import {resolveIcon} from "../services/icons";
import {FastCommentsIconType} from "../types/icon";
import {useState} from "react";
import {createURLQueryString, makeRequest} from "../services/http";
import {getActionTenantId} from "../services/tenants";
import {UpdateCommentTextResponse} from "../types/dto/update-comment-text";
import {newBroadcastId} from "../services/broadcast-id";

export interface CommentActionEditProps extends FastCommentsCommentWithState {
    close: () => void;
}

async function saveCommentText({comment, state}: FastCommentsCommentWithState, newValue: string) {
    const tenantId = getActionTenantId({comment, state});
    const broadcastId = newBroadcastId();
    const response = await makeRequest<UpdateCommentTextResponse>({
        apiHost: state.apiHost,
        method: 'POST',
        url: '/comments/' + tenantId + '/' + comment._id + '/update-text/' + createURLQueryString({
            urlId: state.config.urlId,
            editKey: state.commentState[comment._id]?.editKey,
            sso: state.ssoConfigString,
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
    } else {
        // TODO error handling
        // TODO handle code 'edit-key-invalid')
    }
}

export function CommentActionEdit({comment, state, close}: CommentActionEditProps) {
    const [isLoading, setLoading] = useState(false);
    const [commentText, onChangeText] = useState(comment.comment);
    // TODO common comment writing component
    // TODO ask before closing if content changed
    return <View style={styles.centeredView}>
        <View style={styles.modalView}>
            <TextInput style={styles.textarea} multiline={true} value={commentText} onChangeText={onChangeText}/>
            <Pressable
                style={styles.saveButton}
                onPress={async () => {
                    setLoading(true);
                    try {
                        await saveCommentText({comment, state}, commentText as string);
                        setLoading(false);
                        close();
                    } catch (e) {
                        setLoading(false);
                        // TODO show err message
                    }
                }}
            >
                <Text>{state.translations.SAVE}</Text>
            </Pressable>
            <Pressable
                style={styles.modalCancel}
                onPress={close}
            >
                {resolveIcon(state.icons, FastCommentsIconType.CROSS)(16, 16)}
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
    textarea: {
        alignSelf: 'stretch',
        borderWidth: 1,
        borderColor: 'black'
    },
    saveButton: {
        marginTop: 10
    }
});
