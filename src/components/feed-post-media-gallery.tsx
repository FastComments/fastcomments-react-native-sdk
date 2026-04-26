import { Image, ScrollView, View } from 'react-native';
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

export function FeedPostMediaGallery({ postId, media, styles }: FeedPostMediaGalleryProps) {
    if (!media || media.length === 0) return null;
    return (
        <ScrollView
            horizontal
            testID={`feedPostMedia-${postId}`}
            accessibilityLabel={`feedPostMedia-${postId}`}
            style={styles.feed?.postMediaGallery}
            showsHorizontalScrollIndicator={false}
        >
            {media.map((item, idx) => {
                const asset = pickBestSize(item);
                if (!asset || !asset.src) return null;
                return (
                    <View
                        key={`${postId}-${idx}`}
                        testID={`feedPostMediaItem-${postId}-${idx}`}
                        accessibilityLabel={`feedPostMediaItem-${postId}-${idx}`}
                    >
                        <Image
                            source={{ uri: asset.src }}
                            style={styles.feed?.postMediaImage}
                        />
                    </View>
                );
            })}
        </ScrollView>
    );
}
