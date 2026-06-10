import { View } from 'react-native';
import { ReplyArea } from './reply-area';
import { ShowHideCommentsToggle } from './show-hide-comments-toggle';
import { SelectSortDirection } from './select-sort-direction';
import { ShowNewLiveCommentsButton } from './show-new-live-comments-button';
import { CommentCount } from './comment-count';
import { isLiveChatStyle } from '../services/fastcomments-live-commenting';
import { PageReactsBar } from './page-reacts-bar';
import { FastCommentsCallbacks, IFastCommentsStyles, ImageAssetConfig, RNComment } from '../types';
import { CallbackObserver } from './live-commenting-bottom-area';
import { FastCommentsRNConfig } from '../types/react-native-config';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface LiveCommentingTopAreaProps
    extends Pick<
        FastCommentsCallbacks,
        'onAuthenticationChange' | 'onNotificationSelected' | 'onReplySuccess' | 'pickGIF' | 'pickImage'
    > {
    callbackObserver: CallbackObserver;
    config: FastCommentsRNConfig;
    imageAssets: ImageAssetConfig;
    onReplySuccess?: (comment: RNComment) => void;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
}

export function LiveCommentingTopArea(props: LiveCommentingTopAreaProps) {
    const {
        callbackObserver,
        config,
        imageAssets,
        onAuthenticationChange,
        onNotificationSelected,
        onReplySuccess,
        pickGIF,
        pickImage,
        store,
        styles,
        translations,
    } = props;

    const areCommentsVisible = useStoreValue(store, (s) => s.commentsVisible);
    const serverCommentCount = useStoreValue(store, (s) => s.commentCountOnServer);
    const newRootCommentCount = useStoreValue(store, (s) => s.newRootCommentCount);

    return (
        <View>
            {config.pageReactConfig && <PageReactsBar store={store} styles={styles} />}
            <View>
                {config.inputAfterComments !== true && (
                    <View style={styles.topArea?.replyArea}>
                        <ReplyArea
                            imageAssets={imageAssets}
                            onAuthenticationChange={onAuthenticationChange}
                            onNotificationSelected={onNotificationSelected}
                            onReplySuccess={onReplySuccess}
                            pickGIF={pickGIF}
                            pickImage={pickImage}
                            replyingTo={callbackObserver.replyingTo}
                            store={store}
                            styles={styles}
                            translations={translations}
                        />
                    </View>
                )}
            </View>
            <View>
                {config.useShowCommentsToggle && serverCommentCount > 0 && (
                    <ShowHideCommentsToggle store={store} styles={styles} />
                )}
            </View>
            {/* Chat presents one chronological stream: a comment count + sort
                selector header contradicts it and wastes vertical space. */}
            {areCommentsVisible && serverCommentCount > 0 && !isLiveChatStyle(config) && (
                <View style={styles.topArea?.separator}>
                    <CommentCount style={styles.topArea?.commentCount} store={store} count={serverCommentCount} />
                    {areCommentsVisible && serverCommentCount > 1 && (
                        <SelectSortDirection store={store} styles={styles} />
                    )}
                </View>
            )}
            <View>
                {areCommentsVisible && newRootCommentCount > 0 && (
                    <ShowNewLiveCommentsButton store={store} styles={styles} />
                )}
            </View>
        </View>
    );
}
