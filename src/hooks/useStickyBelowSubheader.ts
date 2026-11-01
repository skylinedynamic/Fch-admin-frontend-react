import { useLayoutEffect, useState } from 'react';

/** The page title / breadcrumb bar that stays at the top while the page scrolls. */
const SUBHEADER_SELECTOR = '.page-subheader-sticky';

/**
 * The `top` a sticky side card needs to sit exactly under the page's sticky
 * title bar: where that bar ends (its own sticky top + its height), kept up
 * to date when the bar changes height (a long title wrapping, a resize).
 * Pages without such a bar, or a disabled card, get `fallback`.
 */
export function useStickyBelowSubheader(fallback: string, enabled = true): string {
    const [top, setTop] = useState<string | null>(null);

    useLayoutEffect(() => {
        if (!enabled) return undefined;
        const bar = document.querySelector<HTMLElement>(SUBHEADER_SELECTOR);
        if (!bar) return undefined;

        const measure = () => {
            const barTop = parseFloat(getComputedStyle(bar).top) || 0;
            setTop(`${Math.round(barTop + bar.offsetHeight)}px`);
        };
        measure();

        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(bar);
        return () => observer.disconnect();
    }, [enabled]);

    return top ?? fallback;
}
