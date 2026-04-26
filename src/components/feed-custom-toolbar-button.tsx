import { Image, Text, TouchableOpacity } from 'react-native';
import type { FeedPost } from '../types/feed-post';
import type { FeedCustomToolbarButton } from '../types/feed-custom-toolbar-button';
import type { IFastCommentsStyles } from '../types';

export interface FeedCustomToolbarButtonViewProps {
    button: FeedCustomToolbarButton;
    post: FeedPost;
    styles: IFastCommentsStyles;
}

export function FeedCustomToolbarButtonView({ button, post, styles }: FeedCustomToolbarButtonViewProps) {
    const label = typeof button.label === 'function' ? button.label(post) : button.label;
    const icon = typeof button.icon === 'function' ? button.icon(post) : button.icon;
    return (
        <TouchableOpacity
            testID={`feedCustomToolbarButton-${post.id}-${button.id}`}
            accessibilityLabel={`feedCustomToolbarButton-${post.id}-${button.id}`}
            style={styles.feed?.customToolbarButton}
            onPress={() => button.onPress(post)}
        >
            {icon ? <Image source={icon} style={styles.feed?.customToolbarButtonIcon} /> : null}
            {label ? <Text style={styles.feed?.customToolbarButtonLabel}>{label}</Text> : null}
        </TouchableOpacity>
    );
}
