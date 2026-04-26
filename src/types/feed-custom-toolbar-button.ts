import type { ImageURISource } from 'react-native';
import type { FeedPost } from './feed-post';

/**
 * Configuration for a custom toolbar button rendered on each feed post row's
 * footer. Mirrors the Android `FeedCustomToolbarButton` interface but adapted
 * to a per-row React Native API: the host supplies a static config and we
 * call back with the FeedPost when the button is pressed.
 *
 * Localization is the host's responsibility - the SDK has no built-in copy
 * for these buttons.
 */
export interface FeedCustomToolbarButton {
    /** Stable identifier used for the testID and React keys. */
    id: string;
    /**
     * Optional icon. Either a static ImageURISource or a per-post resolver.
     * When omitted the button renders as a text-only label.
     */
    icon?: ImageURISource | ((post: FeedPost) => ImageURISource);
    /** Button label. Either a static string or a per-post resolver. */
    label: string | ((post: FeedPost) => string);
    /** Press handler. Receives the post the button was rendered for. */
    onPress: (post: FeedPost) => void;
    /**
     * Optional visibility predicate. When provided and it returns false the
     * button is omitted for that post.
     */
    visible?: (post: FeedPost) => boolean;
}
