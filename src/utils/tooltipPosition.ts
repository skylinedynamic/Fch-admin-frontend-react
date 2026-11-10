/**
 * Where a hover tooltip goes relative to the element it describes, in window
 * (fixed) coordinates.
 *
 * The whole tooltip is shown wherever it fits, tried in this order: above the
 * element, below it, to its right, to its left. Above/below it is centred on
 * the element horizontally; beside it, vertically - in both cases kept inside
 * the window, with the arrow moved to stay on the element (never past the
 * rounded corners). Only when it fits nowhere (a very small window) does it
 * take the roomier of above/below and get a max height, so it scrolls.
 */

/** Space between the element and the tooltip (the arrow sits in it). */
export const TOOLTIP_GAP = 10;
/** Closest the tooltip may come to the window's edges. */
export const TOOLTIP_MARGIN = 8;
/** Arrow distance from the tooltip's edges at the most. */
const ARROW_INSET = 16;

export interface AnchorRect {
    top: number;
    left: number;
    width: number;
    height: number;
    bottom: number;
    right: number;
}

export type TooltipSide = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipPlacement {
    placement: TooltipSide;
    top: number;
    left: number;
    /** Above/below: the arrow's centre from the tooltip's left edge. */
    arrowLeft?: number;
    /** Right/left: the arrow's centre from the tooltip's top edge. */
    arrowTop?: number;
    /** Set only when the tooltip fits nowhere and must scroll. */
    maxHeight?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

export function placeTooltip(
    anchor: AnchorRect,
    tooltip: { width: number; height: number },
    viewport: { width: number; height: number },
): TooltipPlacement {
    const room = {
        top: anchor.top - TOOLTIP_GAP - TOOLTIP_MARGIN,
        bottom: viewport.height - anchor.bottom - TOOLTIP_GAP - TOOLTIP_MARGIN,
        right: viewport.width - anchor.right - TOOLTIP_GAP - TOOLTIP_MARGIN,
        left: anchor.left - TOOLTIP_GAP - TOOLTIP_MARGIN,
    };
    const fitsWindowHeight = tooltip.height <= viewport.height - 2 * TOOLTIP_MARGIN;

    const centreX = anchor.left + anchor.width / 2;
    const centreY = anchor.top + anchor.height / 2;

    const aboveOrBelow = (placement: 'top' | 'bottom', maxHeight?: number): TooltipPlacement => {
        const height = maxHeight ?? tooltip.height;
        const top = placement === 'top' ? anchor.top - TOOLTIP_GAP - height : anchor.bottom + TOOLTIP_GAP;
        const left = clamp(centreX - tooltip.width / 2, TOOLTIP_MARGIN, viewport.width - TOOLTIP_MARGIN - tooltip.width);
        const arrowLeft = clamp(centreX - left, ARROW_INSET, tooltip.width - ARROW_INSET);
        return { placement, top, left, arrowLeft, ...(maxHeight !== undefined ? { maxHeight } : {}) };
    };

    const beside = (placement: 'right' | 'left'): TooltipPlacement => {
        const left = placement === 'right' ? anchor.right + TOOLTIP_GAP : anchor.left - TOOLTIP_GAP - tooltip.width;
        const top = clamp(centreY - tooltip.height / 2, TOOLTIP_MARGIN, viewport.height - TOOLTIP_MARGIN - tooltip.height);
        const arrowTop = clamp(centreY - top, ARROW_INSET, tooltip.height - ARROW_INSET);
        return { placement, top, left, arrowTop };
    };

    if (tooltip.height <= room.top) return aboveOrBelow('top');
    if (tooltip.height <= room.bottom) return aboveOrBelow('bottom');
    if (fitsWindowHeight && tooltip.width <= room.right) return beside('right');
    if (fitsWindowHeight && tooltip.width <= room.left) return beside('left');

    // Fits nowhere in full: the roomier of above/below, scrolling.
    const placement = room.bottom > room.top ? 'bottom' : 'top';
    return aboveOrBelow(placement, Math.max(0, room[placement]));
}
