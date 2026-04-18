import { CommentAreaMessage } from './comment-area-message';
import { ActivityIndicator, Alert, BackHandler, View } from 'react-native';
import { FastCommentsLiveCommentingService } from '../services/fastcomments-live-commenting';
import { useEffect, useRef, useState } from 'react';
import {
    IFastCommentsStyles,
    FastCommentsCallbacks,
    RNComment,
    ImageAssetConfig,
    FastCommentsImageAsset,
} from '../types';
import { CallbackObserver, LiveCommentingBottomArea } from './live-commenting-bottom-area';
import { getDefaultFastCommentsStyles } from '../resources';
import { FastCommentsRNConfig } from '../types/react-native-config';
import { ShowHideCommentsToggle } from './show-hide-comments-toggle';
import { LiveCommentingList } from './live-commenting-list';
import { CAN_CLOSE, CAN_NOT_CLOSE, ModalMenu } from './modal-menu';
import { getCommentMenuItems, OpenCommentMenuRequest } from './comment-menu';
import { makeRequest } from '../services/http';
import { GetTranslationsResponse } from '../types/dto/get-translations-response';
import { CommentCancelTranslations } from '../types/comment-cancel-translations';
import { addTranslationsToStore } from '../services/translations';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface FastCommentsLiveCommentingProps {
    config: FastCommentsRNConfig;
    styles?: IFastCommentsStyles;
    callbacks?: FastCommentsCallbacks;
    assets?: ImageAssetConfig;
}

export function FastCommentsLiveCommenting({ config, styles, callbacks, assets }: FastCommentsLiveCommentingProps) {
    if (!styles) styles = getDefaultFastCommentsStyles();

    const storeRef = useRef<FastCommentsStore | null>(null);
    if (storeRef.current === null) {
        storeRef.current = FastCommentsLiveCommentingService.createStoreFromConfig({ ...config }, assets);
    }
    const store = storeRef.current!;

    const imageAssets = useStoreValue(store, (s) => s.imageAssets);
    const blockingErrorMessage = useStoreValue(store, (s) => s.blockingErrorMessage);
    const translations = useStoreValue(store, (s) => s.translations);
    const commentsVisible = useStoreValue(store, (s) => s.commentsVisible);
    const hideCommentsUnderCountTextFormat = useStoreValue(store, (s) => s.config.hideCommentsUnderCountTextFormat);
    const useShowCommentsToggle = useStoreValue(store, (s) => !!s.config.useShowCommentsToggle);
    const readonlyConfig = useStoreValue(store, (s) => !!s.config.readonly);
    const rootOrderLength = useStoreValue(store, (s) => s.rootOrder.length);
    const sortDirection = useStoreValue(store, (s) => s.sortDirection);

    const service = useRef<FastCommentsLiveCommentingService>();
    useEffect(() => {
        service.current = new FastCommentsLiveCommentingService(store, callbacks);
        return () => {
            service.current?.destroy();
        };
    }, []);
    const [isLoading, setLoading] = useState(true);
    const [isLoaded, setIsLoaded] = useState(false);
    const isReplyingToParentIdRef = useRef<string | null>(null);
    const [commentMenuRequest, setCommentMenuRequest] = useState<OpenCommentMenuRequest>();
    const callbackObserver: CallbackObserver = {};
    const callbackObserverRef = useRef(callbackObserver);
    const prevUrlIdRef = useRef(config.urlId);
    const prevTenantIdRef = useRef(config.tenantId);

    const loadAsync = async () => {
        if (service.current) {
            setLoading(true);
            await service.current.fetchRemoteState(false);
            setLoading(false);
            setIsLoaded(true);
            // Surface root-level comments as the "rendered" list.
            const latest = store.getState();
            const rootComments: RNComment[] = latest.rootOrder
                .map((id) => latest.byId[id])
                .filter((c): c is RNComment => !!c);
            callbacks?.onCommentsRendered && callbacks?.onCommentsRendered(rootComments);
        }
    };
    useEffect(() => {
        const urlIdChanged = prevUrlIdRef.current !== config.urlId;
        const tenantIdChanged = prevTenantIdRef.current !== config.tenantId;

        if (urlIdChanged || tenantIdChanged) {
            prevUrlIdRef.current = config.urlId;
            prevTenantIdRef.current = config.tenantId;
            const s = store.getState();
            s.resetForNewContext();
            s.mergeConfig({ urlId: config.urlId, tenantId: config.tenantId });
            service.current?.resetForNewContext();
        }
        void loadAsync();
    }, [config.sso?.userDataJSONBase64, config.simpleSSO?.username, config.urlId, config.tenantId]);

    // Re-load when sort direction changes after the first load.
    useEffect(() => {
        if (isLoaded) void loadAsync();
    }, [sortDirection]);

    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            if (isReplyingToParentIdRef.current) {
                void requestSetReplyingTo(null, true);
                return true;
            }
            return false;
        });
        return () => backHandler.remove();
    }, []);

    async function requestSetReplyingTo(comment: RNComment | null, force?: boolean) {
        if (!force && !comment && isReplyingToParentIdRef.current) {
            const s = store.getState();
            if (!s.translations.CONFIRM_CANCEL_REPLY) {
                let url = '/translations/widgets/comment-ui-cancel?useFullTranslationIds=true';
                if (s.config.locale) url += '&locale=' + s.config.locale;
                const translationsResponse = await makeRequest<GetTranslationsResponse<CommentCancelTranslations>>({
                    apiHost: s.apiHost,
                    method: 'GET',
                    url,
                });
                if (translationsResponse.status === 'success') {
                    addTranslationsToStore(store, translationsResponse.translations!);
                }
            }
            const t = store.getState().translations;
            return new Promise<typeof CAN_CLOSE | typeof CAN_NOT_CLOSE>((resolve) => {
                Alert.alert(
                    t.CONFIRM_CANCEL_REPLY_TITLE,
                    t.CONFIRM_CANCEL_REPLY,
                    [
                        {
                            text: t.CONFIRM_CANCEL_REPLY_CANCEL,
                            onPress: () => resolve(CAN_NOT_CLOSE),
                            style: 'cancel',
                        },
                        {
                            text: t.CONFIRM_CANCEL_REPLY_OK,
                            onPress: () => resolve(CAN_CLOSE),
                            style: 'destructive',
                        },
                    ],
                    { onDismiss: () => resolve(CAN_NOT_CLOSE) }
                );
            });
        }
        if (comment) {
            store.getState().setReplyBoxOpen(comment._id, true);
        } else if (isReplyingToParentIdRef.current) {
            store.getState().setReplyBoxOpen(isReplyingToParentIdRef.current, false);
        }
        isReplyingToParentIdRef.current = comment ? comment._id : null;
        callbackObserverRef.current.replyingTo && callbackObserverRef.current.replyingTo(comment);
        callbacks && callbacks.replyingTo && callbacks.replyingTo(comment);
        return CAN_CLOSE;
    }

    function handleReplySuccess(comment: RNComment) {
        void requestSetReplyingTo(null, true);
        callbacks && callbacks?.onReplySuccess && callbacks?.onReplySuccess(comment);
    }

    if (blockingErrorMessage) {
        return (
            <View style={styles.root}>
                <CommentAreaMessage styles={styles} message={blockingErrorMessage} />
            </View>
        );
    } else if (
        !((rootOrderLength === 0 && readonlyConfig) || ((hideCommentsUnderCountTextFormat || useShowCommentsToggle) && !commentsVisible))
    ) {
        if (isLoading) {
            return (
                <View style={[styles.root, styles.loadingOverlay]}>
                    <ActivityIndicator size="large" />
                </View>
            );
        }

        return (
            <View style={styles.root}>
                {commentsVisible && (
                    <LiveCommentingList
                        callbacks={callbacks}
                        callbackObserver={callbackObserverRef.current}
                        config={config}
                        onReplySuccess={handleReplySuccess}
                        requestSetReplyingTo={requestSetReplyingTo}
                        imageAssets={imageAssets}
                        openCommentMenu={(comment, menuState) => setCommentMenuRequest({ comment, menuState })}
                        styles={styles}
                        store={store}
                        service={service}
                    />
                )}
                {commentMenuRequest ? (
                    <ModalMenu
                        key={commentMenuRequest.comment._id}
                        closeIcon={
                            imageAssets[
                                config.hasDarkBackground
                                    ? FastCommentsImageAsset.ICON_CROSS_WHITE
                                    : FastCommentsImageAsset.ICON_CROSS
                            ]
                        }
                        styles={styles}
                        items={getCommentMenuItems(
                            {
                                comment: commentMenuRequest.comment,
                                onCommentFlagged: callbacks?.onCommentFlagged,
                                onError: callbacks?.onError,
                                onUserBlocked: callbacks?.onUserBlocked,
                                pickGIF: callbacks?.pickGIF,
                                pickImage: callbacks?.pickImage,
                                styles,
                                store,
                            },
                            commentMenuRequest.menuState
                        )}
                        isOpen={true}
                        onClose={() => setCommentMenuRequest(undefined)}
                    />
                ) : null}
                <LiveCommentingBottomArea
                    callbackObserver={callbackObserverRef.current}
                    imageAssets={imageAssets}
                    onAuthenticationChange={callbacks?.onAuthenticationChange}
                    onNotificationSelected={callbacks?.onNotificationSelected}
                    onReplySuccess={handleReplySuccess}
                    pickGIF={callbacks?.pickGIF}
                    pickImage={callbacks?.pickImage}
                    store={store}
                    styles={styles}
                    translations={translations}
                />
            </View>
        );
    } else if (!commentsVisible && translations) {
        return (
            <View style={styles.root}>
                <ShowHideCommentsToggle store={store} styles={styles} />
            </View>
        );
    }
    return <View style={styles.root}></View>;
}
