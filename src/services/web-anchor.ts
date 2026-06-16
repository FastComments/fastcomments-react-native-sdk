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
    requestAnimationFrame?: (cb: () => void) => number;
    cancelAnimationFrame?: (id: number) => void;
    scrollX?: number;
    scrollY?: number;
    innerHeight?: number;
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

/** Context handed to a computePosition callback. */
export interface AnchorContext extends WindowScroll {
    /** Measured height of the overlay, or 0 before it has laid out. **/
    overlayHeight: number;
    /** Visible viewport height (window.innerHeight), or 0 off-web. **/
    viewportHeight: number;
}

/** Minimal vertical extent of the trigger needed to flip a dropdown. */
export interface VerticalAnchor {
    /** Trigger top in viewport coords. **/
    top: number;
    /** Trigger bottom in viewport coords. **/
    bottom: number;
}

export interface VerticalPlacementInput {
    anchor: VerticalAnchor;
    scrollY: number;
    overlayHeight: number;
    viewportHeight: number;
    /** Gap between the trigger and the overlay (px). Default 4. **/
    gap?: number;
    /** Keep at least this much space from the viewport edge (px). Default 8. **/
    minMargin?: number;
}

export interface VerticalPlacement {
    /** Page-coordinate top for the overlay. **/
    top: number;
    /** Space available on the chosen side - clamp the overlay's maxHeight to this so it scrolls instead of running off-screen. **/
    maxHeight: number;
    placement: 'below' | 'above';
}

/**
 * Decide whether a dropdown opens below or above its trigger. Opens below by
 * default; flips above only once the overlay's height is known (overlayHeight > 0)
 * AND it doesn't fit below AND there's more room above. Also returns the space
 * available on the chosen side so callers can clamp maxHeight and scroll.
 */
export function placeVertical({
    anchor,
    scrollY,
    overlayHeight,
    viewportHeight,
    gap = 4,
    minMargin = 8,
}: VerticalPlacementInput): VerticalPlacement {
    const spaceBelow = viewportHeight - anchor.bottom - gap;
    const spaceAbove = anchor.top - gap;
    const fitsBelow = overlayHeight > 0 ? overlayHeight <= spaceBelow : true;
    const openAbove = !fitsBelow && spaceAbove > spaceBelow;
    if (openAbove) {
        return {
            top: anchor.top + scrollY - gap - overlayHeight,
            maxHeight: Math.max(0, spaceAbove - minMargin),
            placement: 'above',
        };
    }
    return {
        top: anchor.bottom + scrollY + gap,
        maxHeight: Math.max(0, spaceBelow - minMargin),
        placement: 'below',
    };
}

/**
 * Natural height of an overlay element (web only), or 0 before layout. Uses the
 * larger of the laid-out box and scrollHeight so a maxHeight clamp (from a prior
 * placeVertical pass) doesn't shrink the measurement and defeat the flip.
 */
function measureOverlayHeight(ref?: { current: unknown }): number {
    if (!ref || !isWebDom()) return 0;
    const node = ref.current as { getBoundingClientRect?: () => { height: number }; scrollHeight?: number } | null;
    if (!node) return 0;
    const boxHeight = node.getBoundingClientRect?.().height ?? 0;
    return Math.max(boxHeight, node.scrollHeight ?? 0);
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
 * `isOpen`. `computePosition` maps the current scroll/viewport/overlay metrics to
 * the overlay style (callers measure their own trigger via measureAnchorRect so
 * each can align however it needs; use placeVertical to flip up when there is no
 * room below); returning null leaves the last position. The overlay is
 * repositioned on scroll (capture phase, to catch nested scrollers), on resize,
 * once more after layout (rAF, so the overlay can be measured), and whenever the
 * overlay's own size changes (ResizeObserver - e.g. async content like GIFs).
 * Pass `overlayRef` to enable height-aware flipping. Returns null off-web, when
 * closed, or before the first measure.
 */
export function useAnchoredPosition(
    isOpen: boolean,
    computePosition: (ctx: AnchorContext) => ViewStyle | null,
    deps: unknown[] = [],
    overlayRef?: { current: unknown },
): ViewStyle | null {
    const [position, setPosition] = useState<ViewStyle | null>(null);
    useEffect(() => {
        if (!isWebDom() || !isOpen) {
            setPosition(null);
            return;
        }
        const win = globalThis as unknown as WebWindow;
        const reposition = () => {
            const next = computePosition({
                scrollX: win.scrollX ?? 0,
                scrollY: win.scrollY ?? 0,
                overlayHeight: measureOverlayHeight(overlayRef),
                viewportHeight: win.innerHeight ?? 0,
            });
            if (next) setPosition(next);
        };
        reposition();
        // The overlay is in the DOM but may not be laid out yet on this tick;
        // re-measure next frame so a height-aware flip has a real height.
        const raf = win.requestAnimationFrame?.(reposition);
        win.addEventListener?.('scroll', reposition, true);
        win.addEventListener?.('resize', reposition);
        let ro: { observe: (n: Element) => void; disconnect: () => void } | undefined;
        const node = overlayRef?.current as Element | null;
        if (node && typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(reposition);
            ro.observe(node);
        }
        return () => {
            if (raf !== undefined) win.cancelAnimationFrame?.(raf);
            ro?.disconnect();
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
