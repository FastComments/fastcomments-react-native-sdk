import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { acquireShimmerDriver, shimmerProgress } from './shimmer-driver';

export interface SavingShimmerProps {
    active: boolean;
    /** The sweeping band tint (translucent: the content underneath stays visible). **/
    color?: string;
}

/**
 * A translucent shimmer sweep shown while a comment is submitting/saving, in
 * place of a spinner (mirrors the web widget's `animated-background`). Render it
 * as the last child of a `position: relative` box; it clips itself and does NOT
 * mask the content underneath.
 */
export function SavingShimmer({ active, color = 'rgba(255,255,255,0.5)' }: SavingShimmerProps) {
    const [width, setWidth] = useState(0);

    // Attach to the shared shimmer loop while active (one loop drives all sweeps).
    useEffect(() => {
        if (!active) return;
        return acquireShimmerDriver();
    }, [active]);

    if (!active) return null;
    const band = Math.max(48, width * 0.35);
    const translateX = shimmerProgress.interpolate({ inputRange: [0, 1], outputRange: [-band, width + band] });

    return (
        <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            testID="savingShimmer"
            accessibilityLabel="savingShimmer"
        >
            <Animated.View
                style={{
                    position: 'absolute',
                    top: -8,
                    bottom: -8,
                    width: band,
                    backgroundColor: color,
                    transform: [{ translateX }, { skewX: '-18deg' }],
                }}
            />
        </View>
    );
}
