import { useEffect, useState } from 'react';
import { Platform, type ViewStyle } from 'react-native';

// Shared web-only DOM anchoring used by the overlays that portal to document.body
// (dropdowns, the GIF popover): the virtualized comment list clips/overpaints
// inline overlays, so they are positioned with page coordinates measured off
// their trigger element. Previously each overlay hand-rolled the same
// `globalThis` cast + getBoundingClientRect cast + scroll/resize listener wiring;
// these helpers centralize the fragile parts.

interface WebWindow {
    addEventListener?: (t: string, h: () => void, c?: boolean) => void;
    removeEventListener?: (t: string, h: () => void, c?: boolean) => void;
    scrollX?: number;
    scrollY?: number;
}

/** Viewport rect of a trigger element, as returned by getBoundingClientRect. */
export interface AnchorRect {
    top: number;
    bottom: number;
    left: number;
    right: number;
    width: number;
    height: number;
}

export interface WindowScroll {
    scrollX: number;
    scrollY: number;
}

/** True when running on react-native-web with a real DOM available. */
export function isWebDom(): boolean {
    return Platform.OS === 'web' && typeof document !== 'undefined';
}

/**
 * Read a trigger's viewport rect via the DOM (web only). The ref holds a
 * react-native-web component instance whose host node exposes
 * getBoundingClientRect; returns undefined off-web or before layout.
 */
export function measureAnchorRect(ref: { current: unknown }): AnchorRect | undefined {
    if (!isWebDom()) return undefined;
    const node = ref.current as { getBoundingClientRect?: () => AnchorRect } | null;
    const rect = node?.getBoundingClientRect?.();
    return rect
        ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height }
        : undefined;
}

/**
 * Web-only: keep an absolutely-positioned overlay anchored to a trigger while
 * `isOpen`. `computePosition` maps the current scroll offset to the overlay
 * style (callers measure their own trigger via measureAnchorRect so each can
 * align however it needs); returning null leaves the last position. The overlay
 * is repositioned on scroll (capture phase, to catch nested scrollers) and
 * resize. Returns null off-web, when closed, or before the first measure.
 */
export function useAnchoredPosition(
    isOpen: boolean,
    computePosition: (scroll: WindowScroll) => ViewStyle | null,
    deps: unknown[] = [],
): ViewStyle | null {
    const [position, setPosition] = useState<ViewStyle | null>(null);
    useEffect(() => {
        if (!isWebDom() || !isOpen) {
            setPosition(null);
            return;
        }
        const win = globalThis as unknown as WebWindow;
        const reposition = () => {
            const next = computePosition({ scrollX: win.scrollX ?? 0, scrollY: win.scrollY ?? 0 });
            if (next) setPosition(next);
        };
        reposition();
        win.addEventListener?.('scroll', reposition, true);
        win.addEventListener?.('resize', reposition);
        return () => {
            win.removeEventListener?.('scroll', reposition, true);
            win.removeEventListener?.('resize', reposition);
        };
        // computePosition is recreated every render; callers pass the values it
        // closes over via `deps` instead of depending on the function identity.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, ...deps]);
    return position;
}

/**
 * Web-only: invoke `onDismiss` when a click lands outside every element in
 * `ignoreRefs` (the trigger and the overlay content). Uses a capture-phase
 * document listener that explicitly excludes those subtrees, so dismissal no
 * longer depends on the opening click being swallowed before it bubbles to
 * document or on selection handlers running first.
 */
export function useDismissOnOutsideClick(
    isOpen: boolean,
    onDismiss: () => void,
    ignoreRefs: Array<{ current: unknown }>,
): void {
    useEffect(() => {
        if (!isWebDom() || !isOpen) return;
        const onClick = (e: { target: unknown }) => {
            for (const ref of ignoreRefs) {
                const node = ref.current as { contains?: (n: unknown) => boolean } | null;
                if (node?.contains?.(e.target)) return;
            }
            onDismiss();
        };
        document.addEventListener('click', onClick as unknown as () => void, true);
        return () => document.removeEventListener('click', onClick as unknown as () => void, true);
        // ignoreRefs/onDismiss are stable-by-convention (refs + a setter); re-bind
        // only when open state flips, matching the prior hand-written effects.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);
}
