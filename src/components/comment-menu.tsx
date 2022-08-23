// @ts-ignore TODO remove
import * as React from 'react';
import {Dispatch, SetStateAction, useState} from 'react';

import {FastCommentsCommentWithState} from "./comment";
import {FastCommentsImageAsset} from "../types/image-asset";
import {ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View} from "react-native";
import {createURLQueryString, makeRequest} from "../services/http";
import {GetCommentTextResponse} from "../types/dto/get-comment-text";
import {CommentActionEdit} from './comment-action-edit';
import {CommentPromptDelete} from "./comment-action-delete";
import {repositionComment} from "../services/comment-positioning";
import {PinCommentResponse} from "../types/dto/pin-comment";
import {BlockCommentResponse} from "../types/dto/block-comment";

async function startEditingComment({state, comment}: FastCommentsCommentWithState, setModalId: Dispatch<SetStateAction<string | null>>) {
    const response = await makeRequest<GetCommentTextResponse>({
        apiHost: state.apiHost.get(),
        method: 'GET',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/text${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey.get()
        })}`
    });
    if (response.status === 'success') {
        comment.comment.set(response.commentText);
        setModalId('edit');
    } else {
        // TODO show error
    }
}

async function setCommentPinStatus({state, comment}: FastCommentsCommentWithState, doPin: boolean) {
    const response = await makeRequest<PinCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/comments/${state.config.tenantId.get()}/${comment._id.get()}/${doPin ? 'pin' : 'unpin'}${createURLQueryString({
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get()
        })}`
    });
    if (response.status === 'success') {
        comment.isPinned.set(doPin);
        repositionComment(comment._id.get(), response.commentPositions!, state);
    } else {
        // TODO show error
    }
}

async function setCommentBlockedStatus({state, comment}: FastCommentsCommentWithState, doBlock: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: doBlock ? 'POST' : 'DELETE',
        url: `/block-from-comment/${comment._id.get()}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            editKey: state.commentState[comment._id.get()]?.editKey?.get()
        })}`,
        body: {
            commentIds: Object.keys(state.commentsById.get())
        }
    });
    if (response.status === 'success') {
        comment.isBlocked.set(doBlock);
        for (const otherCommentId in response.commentStatuses) {
            if (state.commentsById[otherCommentId].get()) {
                const existing = !!state.commentsById[otherCommentId].isBlocked.get();
                const newValue = response.commentStatuses[otherCommentId];
                if (existing !== newValue) {
                    state.commentsById[otherCommentId].isBlocked.set(newValue);
                }
            }
        }
    } else {
        // TODO show error
    }
}

async function setCommentFlaggedStatus({state, comment}: FastCommentsCommentWithState, doFlag: boolean) {
    const response = await makeRequest<BlockCommentResponse>({
        apiHost: state.apiHost.get(),
        method: 'POST',
        url: `/flag-comment/${comment._id.get()}/${createURLQueryString({
            tenantId: state.config.tenantId.get(),
            urlId: state.config.urlId.get(),
            sso: state.ssoConfigString.get(),
            isFlagged: doFlag
        })}`
    });
    if (response.status === 'success') {
        comment.isFlagged.set(doFlag);
    } else {
        // TODO show error
        // response.translatedError is supported here (but why not in all actions?)
    }
}

export function CommentMenu({comment, state}: FastCommentsCommentWithState) {
    const currentUser = state.currentUser.get();
    const isMyComment = currentUser && 'id' in currentUser && (comment.userId.get() === currentUser.id || comment.anonUserId.get() === currentUser.id);
    console.log('isMyComment', isMyComment, currentUser, comment.userId.get(), comment.anonUserId.get(), state.isSiteAdmin.get()); // TODO REMOVE
    const canEdit = !comment.isDeleted.get() && ((currentUser && 'authorized' in currentUser && currentUser.authorized && (state.isSiteAdmin.get() || isMyComment))); // can have edit key and be anon
    const canPin = state.isSiteAdmin.get() && !(comment.parentId?.get());
    const canBlockOrFlag = !comment.isDeleted?.get() && !comment.isByAdmin?.get() && !comment.isByModerator?.get() && !isMyComment && currentUser && 'authorized' in currentUser && currentUser.authorized;

    const menuItems: any[] = []; // creating an array for every comment rendered is not ideal

    if (canEdit) {
        menuItems.push({
            label: state.translations.COMMENT_MENU_EDIT.get(),
            value: 'edit',
            icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_EDIT_BIG]} style={{width: 24, height: 24}}/>,
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
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_UNPIN_BIG]} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentPinStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_PIN.get(),
                value: 'pin',
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_PIN_BIG]} style={{width: 24, height: 24}}/>,
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
            icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_TRASH]} style={{width: 24, height: 24}}/>,
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
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_BLOCK]} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentBlockedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_BLOCK_USER.get(),
                value: 'block',
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_BLOCK]} style={{width: 24, height: 24}}/>,
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
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_BLOCK]} style={{width: 24, height: 24}}/>,
                handler: async () => {
                    await setCommentFlaggedStatus({comment, state}, false);
                }
            });
        } else {
            menuItems.push({
                label: state.translations.COMMENT_MENU_FLAG.get(),
                value: 'flag',
                icon: <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_BLOCK]} style={{width: 24, height: 24}}/>,
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
                            {item.icon}
                            <Text style={styles.menuOptionText}>{item.label}</Text>
                        </Pressable>
                    )}
                    <Pressable
                        style={styles.modalCancel}
                        onPress={() => setModalIdVisible(null)}
                    >
                        {<Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_CROSS]} style={{width: 16, height: 16}}/>}
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
            <Image source={state.imageAssets.get()[FastCommentsImageAsset.ICON_EDIT_SMALL]} style={{width: 16, height: 16}}/>
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
