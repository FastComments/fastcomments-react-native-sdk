import { FastCommentsCallbacks } from '../types';
import { View } from 'react-native';
import { ReplyArea } from './reply-area';
import { IFastCommentsStyles } from '../types';
import { ImageAssetConfig, RNComment } from '../types';
import { useState } from 'react';
import type { FastCommentsStore } from '../store/types';
import { useStoreValue } from '../store/hooks';

export interface LiveCommentingBottomAreaProps
    extends Pick<
        FastCommentsCallbacks,
        'onAuthenticationChange' | 'onNotificationSelected' | 'onReplySuccess' | 'pickGIF' | 'pickImage'
    > {
    imageAssets: ImageAssetConfig;
    store: FastCommentsStore;
    styles: IFastCommentsStyles;
    translations: Record<string, string>;
    callbackObserver: CallbackObserver;
}

export interface CallbackObserver {
    replyingTo?: (comment: RNComment | null) => void;
}

export function LiveCommentingBottomArea(props: LiveCommentingBottomAreaProps) {
    const {
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
    const inputAfterComments = useStoreValue(store, (s) => !!s.config.inputAfterComments);
    const [parentComment, setParentComment] = useState<RNComment | null>();

    props.callbackObserver.replyingTo = (comment) => {
        setParentComment(comment ?? null);
    };

    return (
        <View style={styles.bottomArea?.root}>
            <View>
                {inputAfterComments && (
                    <View style={styles.bottomArea?.replyArea}>
                        <ReplyArea
                            imageAssets={imageAssets}
                            onAuthenticationChange={onAuthenticationChange}
                            onNotificationSelected={onNotificationSelected}
                            onReplySuccess={onReplySuccess}
                            parentComment={parentComment}
                            pickGIF={pickGIF}
                            pickImage={pickImage}
                            replyingTo={props.callbackObserver.replyingTo}
                            store={store}
                            styles={styles}
                            translations={translations}
                        />
                    </View>
                )}
            </View>
        </View>
    );
}
