/**
 * Page layout for the agreement: the builder's canvas, its preview and the
 * signing page all lay blocks onto A4 pages with these two functions, so a
 * page looks the same everywhere.
 *
 * Both are embedded as source into the template's own script (PREVIEW_JS via
 * `.toString()`), so each must stay self-contained: no imports, no outer
 * variables, no helpers - only what is written inside the function.
 */

export interface LineBox { top: number; bottom: number }

export interface PageItem {
    height: number;
    marginTop: number;
    marginBottom: number;
    /** Lines (or table rows) inside the block, from its top; null when it must not be cut. */
    boxes: LineBox[] | null;
    pageBreak?: boolean;
    /** A heading: never left at the bottom of a page without the first line after it. */
    keepWithNext?: boolean;
}

export interface PageSlot { index: number; clipTop: number; clipHeight: number; isSplit: boolean }

export function planPages(items: PageItem[], usable: number): PageSlot[][] {
    // Where a block may be cut: halfway between two lines that do not overlap.
    function cutsOf(item: PageItem): number[] {
        if (!item.boxes || item.boxes.length < 2) return [];
        const sorted = item.boxes.slice().sort(function (a, b) { return a.top - b.top; });
        const lines: LineBox[] = [];
        for (let i = 0; i < sorted.length; i++) {
            const last = lines[lines.length - 1];
            if (last && sorted[i].top < last.bottom - 1) last.bottom = Math.max(last.bottom, sorted[i].bottom);
            else lines.push({ top: sorted[i].top, bottom: sorted[i].bottom });
        }
        const cuts: number[] = [];
        for (let j = 0; j < lines.length - 1; j++) cuts.push(Math.round((lines[j].bottom + lines[j + 1].top) / 2));
        return cuts;
    }
    // The furthest cut in (from, to], or -1.
    function lastCut(cuts: number[], from: number, to: number): number {
        let best = -1;
        for (let i = 0; i < cuts.length; i++) if (cuts[i] > from && cuts[i] <= to) best = cuts[i];
        return best;
    }

    const pages: PageSlot[][] = [[]];
    let used = 0;
    let lastMb = 0;
    const current = function () { return pages[pages.length - 1]; };
    const newPage = function () { pages.push([]); used = 0; lastMb = 0; };

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.pageBreak) {
            current().push({ index: i, clipTop: 0, clipHeight: 0, isSplit: false });
            newPage();
            continue;
        }
        const cuts = cutsOf(item);
        let gap = current().length === 0 ? 0 : Math.max(lastMb, item.marginTop);

        let fits = used + gap + item.height <= usable;
        if (fits && item.keepWithNext && current().length > 0 && i + 1 < items.length && !items[i + 1].pageBreak) {
            const next = items[i + 1];
            const nextCuts = cutsOf(next);
            const nextFirst = nextCuts.length ? nextCuts[0] : next.height;
            if (used + gap + item.height + Math.max(item.marginBottom, next.marginTop) + nextFirst > usable) fits = false;
        }
        if (fits) {
            current().push({ index: i, clipTop: 0, clipHeight: item.height, isSplit: false });
            used += gap + item.height;
            lastMb = item.marginBottom;
            continue;
        }

        // Does not fit whole. Cut it at the last line that fits, if any does;
        // otherwise start it on a new page (cutting there only if it is taller than a page).
        let consumed = 0;
        let first = lastCut(cuts, 0, usable - used - gap);
        if (first < 0 || current().length === 0 && item.keepWithNext) {
            if (current().length > 0) newPage();
            gap = 0;
            if (item.height <= usable) {
                current().push({ index: i, clipTop: 0, clipHeight: item.height, isSplit: false });
                used = item.height;
                lastMb = item.marginBottom;
                continue;
            }
            first = lastCut(cuts, 0, usable);
            if (first < 0) first = usable;
        }
        current().push({ index: i, clipTop: 0, clipHeight: first, isSplit: true });
        consumed = first;
        while (consumed < item.height) {
            newPage();
            let end = item.height - consumed <= usable ? item.height : lastCut(cuts, consumed, consumed + usable);
            if (end < 0) end = consumed + usable;
            current().push({ index: i, clipTop: consumed, clipHeight: end - consumed, isSplit: true });
            used = end - consumed;
            consumed = end;
        }
        lastMb = item.marginBottom;
    }
    return pages;
}

/**
 * The lines (and table rows) of a block, from its top edge. A table row is one
 * box, so a row is never cut. Returns null for a block without text to cut
 * between (a logo, a field, a signature, the parties row).
 */
export function measureLineBoxes(block: HTMLElement): LineBox[] | null {
    const text = block.matches('.p-text, .ab4-editor') ? block : block.querySelector('.p-text, .ab4-editor');
    if (!text || block.querySelector('input, textarea, .p-parties-grid, .ab4-parties, .p-letterhead')) return null;
    const origin = block.getBoundingClientRect().top;
    const boxes: LineBox[] = [];
    const rows = text.querySelectorAll('tr');
    for (let r = 0; r < rows.length; r++) {
        const rect = rows[r].getBoundingClientRect();
        boxes.push({ top: rect.top - origin, bottom: rect.bottom - origin });
    }
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node = walker.nextNode();
    while (node) {
        if (node.nodeValue && node.nodeValue.trim() && !(node.parentElement && node.parentElement.closest('table'))) {
            range.selectNodeContents(node);
            const rects = range.getClientRects();
            for (let k = 0; k < rects.length; k++) {
                if (rects[k].height > 0) boxes.push({ top: rects[k].top - origin, bottom: rects[k].bottom - origin });
            }
        }
        node = walker.nextNode();
    }
    return boxes.length ? boxes : null;
}
