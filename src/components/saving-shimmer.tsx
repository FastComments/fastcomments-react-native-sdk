import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

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
    const progress = useRef(new Animated.Value(0)).current;
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!active) return;
        progress.setValue(0);
        const loop = Animated.loop(
            Animated.timing(progress, {
                toValue: 1,
                duration: 1100,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: Platform.OS !== 'web',
            })
        );
        loop.start();
        return () => loop.stop();
    }, [active, progress]);

    if (!active) return null;
    const band = Math.max(48, width * 0.35);
    const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-band, width + band] });

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
