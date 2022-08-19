// @ts-ignore TODO remove
import * as React from 'react';
import {Dispatch, SetStateAction, useState} from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsIconType} from "../types/icon";
import {resolveIcon} from "../services/icons";
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {createURLQueryString, makeRequest} from "../services/http";
import {GetCommentTextResponse} from "../types/dto/get-comment-text";
import { CommentActionEdit } from './comment-action-edit';
import {CommentPromptDelete} from "./comment-action-delete";

async function startEditingComment(props: FastCommentsCommentWithState, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: props.state.apiHost,
        method: 'GET',
        url: '/comments/' + props.state.config.tenantId + '/' + props.comment._id + '/text' + createURLQueryString({
            sso: props.state.ssoConfigString,
            editKey: props.state.commentState[props.comment._id]?.editKey
        })
    });
    if (response.status === 'success') {
        props.comment.comment = response.commentText;
        setModalId('edit');
    } else {
        // TODO show error
    }
}

async function setCommentPinStatus(_props: FastCommentsCommentWithState, _doPin: boolean) {

}

async function setCommentBlockedStatus(_props: FastCommentsCommentWithState, _doBlock: boolean) {

}

async function setCommentFlaggedStatus(_props: FastCommentsCommentWithState, _doFlag: boolean) {

}

export function CommentMenu(props: FastCommentsCommentWithState) {
    const {comment, state} = props;
    const currentUser = state.currentUser;
    const isMyComment = currentUser && 'id' in currentUser && (comment.userId === currentUser.id || comment.anonUserId === currentUser.id);
    console.log('isMyComment', isMyComment, currentUser, comment.userId, comment.anonUserId);
    const canEdit = !comment.isDeleted && ((currentUser && 'authorized' in currentUser && currentUser.authorized && (state.isSiteAdmin || isMyComment))); // can have edit key and be anon
    const canPin = state.isSiteAdmin && !comment.parentId;
    const canBlockOrFlag = !comment.isDeleted && !comment.isByAdmin && !comment.isByModerator && !isMyComment && currentUser && 'authorized' in currentUser && currentUser.authorized;

    const menuItems: any[] = [];

    if (canEdit) {
        menuItems.push({
            label: props.state.translations.COMMENT_MENU_EDIT,
            value: 'edit',
            icon: resolveIcon(state.icons, FastCommentsIconType.EDIT_BIG),
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await startEditingComment(props, setModalId);
            }
        });
    }

    if (canPin) {
        if (props.comment.isPinned) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNPIN,
                value: 'unpin',
                icon: resolveIcon(state.icons, FastCommentsIconType.UNPIN_BIG),
                handler: async () => {
                    await setCommentPinStatus(props, false);
                }
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_PIN,
                value: 'pin',
                icon: resolveIcon(state.icons, FastCommentsIconType.PIN_BIG),
                handler: async () => {
                    await setCommentPinStatus(props, true);
                }
            });
        }
    }

    if (canEdit) {
        menuItems.push({
            label: props.state.translations.COMMENT_MENU_DELETE,
            value: 'delete',
            icon: resolveIcon(state.icons, FastCommentsIconType.TRASH),
            handler: async () => {
                await CommentPromptDelete({
                    comment,
                    state,
                    close: () => setModalIdVisible(null)
                });
            }
        });
    }

    if (canBlockOrFlag) {
        if (props.comment.isBlocked) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNBLOCK_USER,
                value: 'unblock',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentBlockedStatus(props, false);
                }
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_BLOCK_USER,
                value: 'block',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentBlockedStatus(props, true);
                }
            });
        }
    }

    if (canBlockOrFlag) {
        if (props.comment.isFlagged) {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_UNFLAG,
                value: 'unflag',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentFlaggedStatus(props, false);
                }
            });
        } else {
            menuItems.push({
                label: props.state.translations.COMMENT_MENU_FLAG,
                value: 'flag',
                icon: resolveIcon(state.icons, FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentFlaggedStatus(props, true);
                }
            });
        }
    }

    // TODO common modal-menu component
    const [activeModalId, setModalIdVisible] = useState<string | null>(null);
    const [isLoading, setLoading] = useState(false);

    return (<View style={styles.centeredView}>
        <Modal
            animationType="slide"
            transparent={true}
            visible={activeModalId === 'menu'}
            onRequestClose={() => {
                setModalIdVisible(null);
            }}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    {menuItems.map((item) =>
                        <Pressable
                            key={item.label}
                            style={styles.menuOptionButton} onPress={async () => {
                            setLoading(true);
                            await item.handler(setModalIdVisible);
                            setLoading(false);
                        }}
                        >
                            {item.icon()}
                            <Text style={styles.menuOptionText}>{item.label}</Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={styles.modalCancel}
                        onPress={() => setModalIdVisible(null)}
                    >
                        {resolveIcon(state.icons, FastCommentsIconType.CROSS)(16, 16)}
                    </Pressable>
                    {
                        isLoading && <View style={styles.loadingView}>
                            <ActivityIndicator size="large"/>
                        </View>
                    }
                </View>
            </View>
        </Modal>
        <Modal
            animationType="slide"
            transparent={true}
            visible={activeModalId === 'edit'}
            onRequestClose={() => {
                setModalIdVisible(null);
            }}>
            <CommentActionEdit comment={comment} state={state} close={() => setModalIdVisible(null)}/>
        </Modal>
        <Pressable
            style={styles.menuButton}
            onPress={() => setModalIdVisible('menu')}>
            {resolveIcon(state.icons, FastCommentsIconType.EDIT_SMALL)()}
        </Pressable>
    </View>);
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 22
    },
    modalView: {
        margin: 20,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 35,
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
    menuOptionButton: {
        flexDirection: 'row',
        minWidth: 100,
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        elevation: 2,
        color: 'black'
    },
    menuButton: {
        padding: 10,
        justifyContent: 'center',
        alignItems: 'center'
    },
    menuOptionText: {
        paddingLeft: 10,
        color: "black",
        fontWeight: "bold",
        textAlign: "left"
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
    }
});
