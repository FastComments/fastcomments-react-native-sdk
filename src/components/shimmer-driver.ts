import { Animated, Easing, Platform } from 'react-native';

// One shared 0->1 progress value drives every active shimmer sweep, instead of
// each SavingShimmer running its own Animated.loop. A loading state can mount
// many shimmers at once (e.g. ListLoadingSkeleton = ~15), and N independent
// loops/timers are a needless CPU spike; this collapses them to a single loop
// while keeping each sweep's own width-based interpolation. Ref-counted: the
// loop starts on the first consumer and stops when the last one detaches.

export const shimmerProgress = new Animated.Value(0);

let refCount = 0;
let loop: Animated.CompositeAnimation | null = null;

/** Start (or join) the shared shimmer loop; returns a detach fn for cleanup. */
export function acquireShimmerDriver(): () => void {
    refCount++;
    if (refCount === 1) {
        // Reset phase only when starting fresh - a later consumer joining mid-cycle
        // must not snap the value and jolt the shimmers already on screen.
        shimmerProgress.setValue(0);
        loop = Animated.loop(
            Animated.timing(shimmerProgress, {
                toValue: 1,
                duration: 1100,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: Platform.OS !== 'web',
            })
        );
        loop.start();
    }
    let detached = false;
    return () => {
        if (detached) return;
        detached = true;
        refCount--;
        if (refCount === 0 && loop) {
            loop.stop();
            loop = null;
        }
    };
}
