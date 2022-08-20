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

async function startEditingComment({state, comment}: FastCommentsCommentWithState, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'GET',
        url: '/comments/' + state.config.tenantId.get() + '/' + comment._id.get() + '/text' + createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey.get()
        })
    });
    if (response.status === 'success') {
        comment.comment.set(response.commentText);
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

export function CommentMenu({comment, state}: FastCommentsCommentWithState) {
    const currentUser = state.currentUser.get();
    const isMyComment = currentUser && 'id' in currentUser && (comment.userId.get() === currentUser.id || comment.anonUserId.get() === currentUser.id);
    console.log('isMyComment', isMyComment, currentUser, comment.userId.get(), comment.anonUserId.get()); // TODO REMOVE
    const canEdit = !comment.isDeleted.get() && ((currentUser && 'authorized' in currentUser && currentUser.authorized && (state.isSiteAdmin || isMyComment))); // can have edit key and be anon
    const canPin = state.isSiteAdmin && !(comment.parentId?.get());
    const canBlockOrFlag = !comment.isDeleted?.get() && !comment.isByAdmin?.get() && !comment.isByModerator?.get() && !isMyComment && currentUser && 'authorized' in currentUser && currentUser.authorized;

    const menuItems: any[] = []; // creating an array for every comment rendered is not ideal

    if (canEdit) {
        menuItems.push({
            label: state.translations.COMMENT_MENU_EDIT.get(),
            value: 'edit',
            icon: resolveIcon(state.icons.get(), FastCommentsIconType.EDIT_BIG),
            handler: async (setModalId: Dispatch<SetStateAction<string | null>>) => {
                await startEditingComment({comment, state}, setModalId);
            }
        });
    }

    if (canPin) {
        if (comment.isPinned.get()) {
            menuItems.push({
                label: state.translations.COMMENT_MENU_UNPIN.get(),
                value: 'unpin',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.UNPIN_BIG),
                handler: async () => {
                    await setCommentPinStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_PIN.get(),
                value: 'pin',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.PIN_BIG),
                handler: async () => {
                    await setCommentPinStatus({comment, state}, true);
                }
            });
        }
    }

    if (canEdit) {
        menuItems.push({
            label: state.translations.COMMENT_MENU_DELETE.get(),
            value: 'delete',
            icon: resolveIcon(state.icons.get(), FastCommentsIconType.TRASH),
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
        if (comment.isBlocked.get()) {
            menuItems.push({
                label: state.translations.COMMENT_MENU_UNBLOCK_USER.get(),
                value: 'unblock',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_BLOCK_USER.get(),
                value: 'block',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, true);
                }
            });
        }
    }

    if (canBlockOrFlag) {
        if (comment.isFlagged.get()) {
            menuItems.push({
                label: state.translations.COMMENT_MENU_UNFLAG.get(),
                value: 'unflag',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_FLAG.get(),
                value: 'flag',
                icon: resolveIcon(state.icons.get(), FastCommentsIconType.BLOCK),
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, true);
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
                        {resolveIcon(state.icons.get(), FastCommentsIconType.CROSS)(16, 16)}
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
            {resolveIcon(state.icons.get(), FastCommentsIconType.EDIT_SMALL)()}
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
