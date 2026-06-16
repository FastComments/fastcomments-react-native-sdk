import { placeVertical } from '../web-anchor';

// Viewport is 800px tall in these cases.
const VIEWPORT = 800;

describe('placeVertical', () => {
    it('opens below when the overlay fits below the trigger', () => {
        const r = placeVertical({
            anchor: { top: 100, bottom: 120 },
            scrollY: 0,
            overlayHeight: 200,
            viewportHeight: VIEWPORT,
        });
        expect(r.placement).toBe('below');
        expect(r.top).toBe(124); // bottom + gap(4)
    });

    it('flips above when there is no room below but there is above', () => {
        // Trigger near the bottom: only 30px below, ~750px above.
        const r = placeVertical({
            anchor: { top: 770, bottom: 790 },
            scrollY: 0,
            overlayHeight: 200,
            viewportHeight: VIEWPORT,
        });
        expect(r.placement).toBe('above');
        // top = anchor.top - gap - overlayHeight = 770 - 4 - 200
        expect(r.top).toBe(566);
    });

    it('stays below before the overlay height is known (overlayHeight 0)', () => {
        const r = placeVertical({
            anchor: { top: 770, bottom: 790 },
            scrollY: 0,
            overlayHeight: 0,
            viewportHeight: VIEWPORT,
        });
        expect(r.placement).toBe('below');
    });

    it('does not flip when below is tight but still has more room than above', () => {
        // Trigger near the top: 10px above, lots below -> keep below + scroll.
        const r = placeVertical({
            anchor: { top: 10, bottom: 30 },
            scrollY: 0,
            overlayHeight: 2000,
            viewportHeight: VIEWPORT,
        });
        expect(r.placement).toBe('below');
    });

    it('adds page scroll offset to the computed top', () => {
        const r = placeVertical({
            anchor: { top: 100, bottom: 120 },
            scrollY: 500,
            overlayHeight: 100,
            viewportHeight: VIEWPORT,
        });
        expect(r.top).toBe(624); // 120 + 4 + 500
    });

    it('reports the available space on the chosen side as maxHeight', () => {
        const r = placeVertical({
            anchor: { top: 100, bottom: 120 },
            scrollY: 0,
            overlayHeight: 100,
            viewportHeight: VIEWPORT,
        });
        // spaceBelow = 800 - 120 - 4 = 676, minus minMargin(8) = 668
        expect(r.maxHeight).toBe(668);
    });
});
