import { useState } from 'react';
import { Image, NativeScrollEvent, NativeSyntheticEvent, ScrollView, View } from 'react-native';
import type { IFastCommentsStyles } from '../types';
import type { FeedPostMediaItem, FeedPostMediaItemAsset } from '../types/feed-post';

export interface FeedPostMediaGalleryProps {
    postId: string;
    media: FeedPostMediaItem[];
    styles: IFastCommentsStyles;
}

/**
 * Picks the largest available size; mirrors the Android `getBestQualityImageUrl`
 * fallback used in `PostImagesAdapter`.
 */
function pickBestSize(item: FeedPostMediaItem): FeedPostMediaItemAsset | undefined {
    if (!item.sizes || item.sizes.length === 0) return undefined;
    let best = item.sizes[0];
    for (const candidate of item.sizes) {
        if (candidate.w * candidate.h > best.w * best.h) best = candidate;
    }
    return best;
}

/**
 * Typed image layouts (mirrors Android's SINGLE_IMAGE / MULTI_IMAGE): one image
 * renders full-width at its own aspect ratio; multiple render as a paging
 * carousel with index dots.
 */
export function FeedPostMediaGallery({ postId, media, styles }: FeedPostMediaGalleryProps) {
    const [width, setWidth] = useState(0);
    const [active, setActive] = useState(0);
    if (!media || media.length === 0) return null;
    const f = styles.feed;
    const single = media.length === 1;

    const renderImage = (item: FeedPostMediaItem, idx: number) => {
        const asset = pickBestSize(item);
        if (!asset || !asset.src) return null;
        const ratio = asset.w && asset.h ? asset.w / asset.h : 1.5;
        const sized = width > 0 ? { width, height: Math.round(width / ratio) } : null;
        return (
            <Image
                key={`${postId}-${idx}`}
                testID={`feedPostMediaItem-${postId}-${idx}`}
                accessibilityLabel={`feedPostMediaItem-${postId}-${idx}`}
                source={{ uri: asset.src }}
                style={[f?.postMediaImage, sized]}
                resizeMode="cover"
            />
        );
    };

    if (single) {
        return (
            <View
                testID={`feedPostMedia-${postId}`}
                accessibilityLabel={`feedPostMedia-${postId}`}
                style={f?.postMediaGallery}
                onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            >
                {renderImage(media[0], 0)}
            </View>
        );
    }

    const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (width > 0) setActive(Math.round(e.nativeEvent.contentOffset.x / width));
    };

    return (
        <View
            testID={`feedPostMedia-${postId}`}
            accessibilityLabel={`feedPostMedia-${postId}`}
            style={f?.postMediaGallery}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onMomentumEnd}
                scrollEventThrottle={16}
            >
                {media.map((item, idx) => (
                    <View key={`${postId}-page-${idx}`} style={width > 0 ? { width } : undefined}>
                        {renderImage(item, idx)}
                    </View>
                ))}
            </ScrollView>
            <View style={f?.postMediaDots} testID={`feedPostMediaDots-${postId}`}>
                {media.map((_, idx) => (
                    <View key={`${postId}-dot-${idx}`} style={[f?.postMediaDot, idx === active ? f?.postMediaDotActive : null]} />
                ))}
            </View>
        </View>
    );
}
