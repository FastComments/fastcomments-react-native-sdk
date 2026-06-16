import { StyleProp, View, ViewStyle } from 'react-native';
import { SavingShimmer } from './saving-shimmer';

export interface SkeletonProps {
    /** Size/shape the placeholder via style (width, height, borderRadius, margins). **/
    style?: StyleProp<ViewStyle>;
    /** The muted fill under the sweep. **/
    color?: string;
    /** The moving highlight tint. **/
    highlight?: string;
}

/**
 * A shimmering placeholder block shown in place of a spinner: a muted rounded
 * box with a light sweep across it (shares the `SavingShimmer` sweep). Size it
 * with `style`.
 */
export function Skeleton({
    style,
    color = 'rgba(120,130,150,0.14)',
    highlight = 'rgba(255,255,255,0.5)',
}: SkeletonProps) {
    return (
        <View style={[{ overflow: 'hidden', borderRadius: 6, backgroundColor: color }, style]}>
            <SavingShimmer active color={highlight} />
        </View>
    );
}

export interface ListLoadingSkeletonProps {
    /** How many placeholder rows to render. **/
    rows?: number;
    color?: string;
    highlight?: string;
}

/**
 * A stack of avatar+two-line placeholder rows, used in place of a full-screen
 * spinner while a comment/notification/feed list loads.
 */
export function ListLoadingSkeleton({ rows = 5, color, highlight }: ListLoadingSkeletonProps) {
    // Dynamic count -> a loop is appropriate here (not a fixed-length literal).
    const items = [];
    for (let i = 0; i < rows; i++) {
        items.push(
            <View
                key={i}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 }}
            >
                <Skeleton style={{ width: 32, height: 32, borderRadius: 999 }} color={color} highlight={highlight} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton style={{ width: '40%', height: 10, marginBottom: 6 }} color={color} highlight={highlight} />
                    <Skeleton style={{ width: '85%', height: 10 }} color={color} highlight={highlight} />
                </View>
            </View>
        );
    }
    // alignSelf stretch + full width so a centering parent (e.g. loadingOverlay's
    // alignItems:center) can't squash the rows down to just the avatar circles.
    return (
        <View
            testID="listLoadingSkeleton"
            accessibilityLabel="listLoadingSkeleton"
            style={{ alignSelf: 'stretch', width: '100%' }}
        >
            {items}
        </View>
    );
}
