// use this if you want to use the default layout and layout mechanism

import {CommentAreaMessage} from "./comment-area-message";
import {ActivityIndicator, Alert, BackHandler, View} from "react-native";
import {FastCommentsLiveCommentingService} from "../services/fastcomments-live-commenting";
// @ts-ignore
import React, {useEffect, useRef, useState} from 'react';
import {Downgraded, useHookstate, useHookstateEffect} from "@hookstate/core";
import {IFastCommentsStyles, FastCommentsCallbacks, RNComment, ImageAssetConfig, FastCommentsImageAsset} from "../types";
import {CallbackObserver, LiveCommentingBottomArea} from "./live-commenting-bottom-area";
import {getDefaultFastCommentsStyles} from "../resources";
import {FastCommentsRNConfig} from "../types/react-native-config";
import {ShowHideCommentsToggle} from "./show-hide-comments-toggle";
import {LiveCommentingList} from "./live-commenting-list";
import {CAN_CLOSE, CAN_NOT_CLOSE, ModalMenu} from "./modal-menu";
import {getCommentMenuItems, OpenCommentMenuRequest} from "./comment-menu";
import {makeRequest} from "../services/http";
import {GetTranslationsResponse} from "../types/dto/get-translations-response";
import {CommentCancelTranslations} from "../types/comment-cancel-translations";
import {addTranslationsToState} from "../services/translations";

export interface FastCommentsLiveCommentingProps {
    config: FastCommentsRNConfig
    styles?: IFastCommentsStyles
    callbacks?: FastCommentsCallbacks
    assets?: ImageAssetConfig
}

export function FastCommentsLiveCommenting({config, styles, callbacks, assets}: FastCommentsLiveCommentingProps) {
    if (!styles) {
        styles = getDefaultFastCommentsStyles();
    }
    const serviceInitialState = FastCommentsLiveCommentingService.createFastCommentsStateFromConfig({...config}, assets); // shallow clone is important to prevent extra re-renders
    const imageAssets = serviceInitialState.imageAssets;
    const state = useHookstate(serviceInitialState);
    state.commentsById.attach(Downgraded);
    const service = useRef<FastCommentsLiveCommentingService>();
    useEffect(() => {
        service.current = new FastCommentsLiveCommentingService(state, callbacks);
    }, []);
    const [isLoading, setLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const isReplyingToParentIdRef = useRef<string | null>(null);
    const [commentMenuRequest, setCommentMenuRequest] = useState<OpenCommentMenuRequest>();
    const callbackObserver: CallbackObserver = {};
    const callbackObserverRef = useRef(callbackObserver);

    const loadAsync = async () => {
        if (service.current) {
            setLoading(true);
            await service.current.fetchRemoteState(false);
            setLoading(false);
            setIsLoaded(true);
            callbacks?.onCommentsRendered && callbacks?.onCommentsRendered(state.commentsTree.get());
        }
    }
    useEffect(() => {
        // noinspection JSIgnoredPromiseFromCall
        loadAsync();
    }, [config.sso?.userDataJSONBase64, config.simpleSSO?.username]); // watching whole config object causes duplicate renders.
    useHookstateEffect(() => {
        if (isLoaded) {
            // noinspection JSIgnoredPromiseFromCall
            loadAsync();
        }
    }, [state.sortDirection]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                if (isReplyingToParentIdRef.current) {
                    // noinspection JSIgnoredPromiseFromCall
                    requestSetReplyingTo(null, true); // TODO request is async and this does not support that yet :(
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove()
    }, []);

    async function requestSetReplyingTo(comment: RNComment | null, force?: boolean) {
        // If we're cancelling, and we're already replying to someone, confirm the change.
        // It'd be really cool to check if reply area is dirty, if someone wants to add that.
        if (!force && !comment && isReplyingToParentIdRef.current) {
            if (!state.translations.CONFIRM_CANCEL_REPLY.get()) {
                let url = '/translations/widgets/comment-ui-cancel?useFullTranslationIds=true';
                if (state.config.locale.get()) {
                    url += '&locale=' + state.config.locale.get();
                }
                const translationsResponse = await makeRequest<GetTranslationsResponse<CommentCancelTranslations>>({
                    apiHost: state.apiHost.get(),
                    method: 'GET',
                    url
                });
                if (translationsResponse.status === 'success') {
                    addTranslationsToState(state.translations, translationsResponse.translations!);
                }
            }
            return new Promise<typeof CAN_CLOSE | typeof CAN_NOT_CLOSE>((resolve) => {
                Alert.alert(
                    state.translations.CONFIRM_CANCEL_REPLY_TITLE.get(),
                    state.translations.CONFIRM_CANCEL_REPLY.get(),
                    [
                        {
                            text: state.translations.CONFIRM_CANCEL_REPLY_CANCEL.get(),
                            onPress: () => {
                                resolve(CAN_NOT_CLOSE);
                            },
                            style: 'cancel'
                        },
                        {
                            text: state.translations.CONFIRM_CANCEL_REPLY_OK.get(),
                            onPress: () => {
                                resolve(CAN_CLOSE);
                            },
                            style: 'destructive'
                        }
                    ], {
                        onDismiss: () => {
                            resolve(CAN_NOT_CLOSE);
                        }
                    }
                );
            });
        }
        if (comment) {
            comment.replyBoxOpen = true;
        } else if (isReplyingToParentIdRef.current) {
            state.commentsById[isReplyingToParentIdRef.current].replyBoxOpen.set(false);
        }
        isReplyingToParentIdRef.current = comment ? comment._id : null;
        callbackObserverRef.current.replyingTo && callbackObserverRef.current.replyingTo(comment);
        callbacks && callbacks.replyingTo && callbacks.replyingTo(comment);
        return CAN_CLOSE;
    }

    function handleReplySuccess(comment: RNComment) {
        // noinspection JSIgnoredPromiseFromCall
        requestSetReplyingTo(null, true);
        callbacks && callbacks?.onReplySuccess && callbacks?.onReplySuccess(comment);
    }

    if (state.blockingErrorMessage.get()) {
        return <View style={styles.root}><CommentAreaMessage styles={styles} message={state.blockingErrorMessage.get()}/></View>;
    } else if (!((state.commentsTree.length === 0 && state.config.readonly.get()) || ((state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()) && !state.commentsVisible.get()))) {
        if (isLoading) {
            return <View style={[styles.root, styles.loadingOverlay]}><ActivityIndicator size="large"/></View>
        }

        console.log('!!!! ************** root re-rendered ************** !!!!');

        return <View style={styles.root}>
            {state.commentsVisible.get() && <LiveCommentingList
                callbacks={callbacks}
                callbackObserver={callbackObserverRef.current}
                config={config}
                onReplySuccess={handleReplySuccess}
                requestSetReplyingTo={requestSetReplyingTo}
                imageAssets={imageAssets}
                openCommentMenu={(comment, menuState) => setCommentMenuRequest({
                    comment, menuState
                })}
                styles={styles}
                state={state}
                service={service}/>}
            {commentMenuRequest ?
                <ModalMenu
                    key={commentMenuRequest.comment._id}
                    closeIcon={imageAssets[config.hasDarkBackground ? FastCommentsImageAsset.ICON_CROSS_WHITE : FastCommentsImageAsset.ICON_CROSS]}
                    styles={styles} items={getCommentMenuItems({
                        comment: commentMenuRequest.comment,
                        pickGIF: callbacks?.pickGIF,
                        pickImage: callbacks?.pickImage,
                        styles,
                        state
                    }, commentMenuRequest.menuState)}
                    isOpen={true}
                    onClose={() => setCommentMenuRequest(undefined)}/> : null}
            <LiveCommentingBottomArea
                callbackObserver={callbackObserverRef.current}
                imageAssets={imageAssets}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                onNotificationSelected={callbacks?.onNotificationSelected}
                onReplySuccess={handleReplySuccess}
                pickGIF={callbacks?.pickGIF}
                pickImage={callbacks?.pickImage}
                state={state}
                styles={styles}
                translations={state.translations.get()}
            />
        </View>;
    } else if (!state.commentsVisible.get() && state.translations.get()) {
        return <View style={styles.root}>
            <ShowHideCommentsToggle state={state} styles={styles}/>
        </View>;
    } else {
        return <View style={styles.root}></View>;
    }
}

