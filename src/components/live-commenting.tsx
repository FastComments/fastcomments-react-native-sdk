// use this if you want to use the default layout and layout mechanism

import {CommentAreaMessage} from "./comment-area-message";
import {ActivityIndicator, BackHandler, View} from "react-native";
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
import {ModalMenu} from "./modal-menu";
import {getCommentMenuItems, OpenCommentMenuRequest} from "./comment-menu";

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
    const [isReplyingToParent, setIsReplyingToParent] = useState(false);
    const isReplyingToParentRef = useRef(isReplyingToParent);
    const [commentMenuRequest, setCommentMenuRequest] = useState<OpenCommentMenuRequest>();
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
        loadAsync();
    }, [config.sso?.userDataJSONBase64, config.simpleSSO?.username]); // watching whole config object causes duplicate renders.
    useHookstateEffect(() => {
        if (isLoaded) {
            loadAsync();
        }
    }, [state.sortDirection]);

    const callbackObserver: CallbackObserver = {};
    const callbackObserverRef = useRef(callbackObserver);

    function handleReplyingTo(comment: RNComment | null) {
        // TODO confirm cancel here? would be a nice place to handle it as this is called for back button press and clicking cancel in UI.
        setIsReplyingToParent(!!comment);
        isReplyingToParentRef.current = !!comment;
        callbackObserverRef.current.replyingTo && callbackObserverRef.current.replyingTo(comment);
        callbacks && callbacks.replyingTo && callbacks.replyingTo(comment);
    }

    useEffect(() => {
        const backHandler = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                if (isReplyingToParentRef.current) {
                    handleReplyingTo(null);
                    return true;
                }
                return false;
            }
        );

        return () => backHandler.remove()
    }, []);

    if (state.blockingErrorMessage.get()) {
        return <View style={styles.root}><CommentAreaMessage styles={styles} message={state.blockingErrorMessage.get()}/></View>;
    } else if (!((state.commentsTree.length === 0 && state.config.readonly.get()) || ((state.config.hideCommentsUnderCountTextFormat.get() || state.config.useShowCommentsToggle.get()) && !state.commentsVisible.get()))) {
        if (isLoading) {
            return <View style={[styles.root, styles.loadingOverlay]}><ActivityIndicator size="large"/></View>
        }

        console.log('!!!! ************** root re-rendered ************** !!!!')

        return <View style={styles.root}>
            {state.commentsVisible.get() && <LiveCommentingList
                callbacks={callbacks}
                callbackObserver={callbackObserverRef.current}
                config={config}
                handleReplyingTo={handleReplyingTo}
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
                    styles={styles} items={getCommentMenuItems({comment: commentMenuRequest.comment, styles, state}, commentMenuRequest.menuState)}
                    isOpen={true}
                    onClose={() => setCommentMenuRequest(undefined)}/> : null}
            <LiveCommentingBottomArea
                callbackObserver={callbackObserverRef.current}
                imageAssets={imageAssets}
                onAuthenticationChange={callbacks?.onAuthenticationChange}
                onNotificationSelected={callbacks?.onNotificationSelected}
                onReplySuccess={callbacks?.onReplySuccess}
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

