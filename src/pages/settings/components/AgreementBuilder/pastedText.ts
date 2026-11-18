/**
 * Turns pasted content into the HTML a text block holds, keeping the look it
 * had where it was copied from - Microsoft Word, ChatGPT, Claude, Google Docs
 * or any web page: fonts, sizes, colours, bold, paragraph spacing, alignment,
 * indents, and table borders, shading and cell sizes. Word gives much of its
 * look by class, so the class styles in its clipboard <style> block are applied.
 *
 * Never kept:
 * - anything unsafe: scripts, images, embeds, unsafe links, url()/expression
 *   styles, and layout properties (position, display, float, height...);
 * - a dark page's theme: the background of page containers (div, section...),
 *   and near-white text with no background of its own under it, which would
 *   vanish on the white page. A code block's own background and text stay.
 *
 * Markdown and plain text (an AI chat's Copy button, or a PDF - whose copy
 * holds no formatting at all) are turned into the same structure.
 */

/** A table drawn without borders (a Word layout table, e.g. side-by-side signature blocks). */
export const PLAIN_TABLE_CLASS = 'ab-plain-table';

const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'img', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'object', 'embed', 'video', 'audio', 'canvas', 'noscript', 'template', 'picture', 'source', 'form']);
const INLINE: Record<string, string> = {
    b: 'strong', strong: 'strong', i: 'em', em: 'em', u: 'u',
    s: 's', del: 's', strike: 's', sub: 'sub', sup: 'sup', code: 'code',
    span: 'span', font: 'span', mark: 'span', small: 'span', big: 'span', ins: 'u',
};
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
/** Headings below this level are folded into it. */
const DEEPEST_HEADING = 4;
/** Containers that become a <div> only when they carry a look of their own. */
const DIV_LIKE = new Set(['div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'figure', 'figcaption', 'address', 'nav', 'dl', 'dt', 'dd', 'center', 'body']);
const TABLE_PARTS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col']);
const BLOCKS = new Set([...DIV_LIKE, ...HEADINGS, ...TABLE_PARTS, 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr']);

/** The links a pasted agreement may keep; anything else keeps only its text. */
const SAFE_LINK = /^(https?:|mailto:|tel:)/i;
const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"';
// Google Docs wraps a whole copy in <b style="font-weight:normal">. Word's
// "mso-bidi-font-weight:normal" on a real bold run must not match.
const NOT_BOLD = /(^|;)\s*font-weight\s*:\s*(normal|400)/i;
// Collapsible whitespace: a non-breaking space (Word's runs of spaces) is kept.
const COLLAPSIBLE = /[ \t\n\r\f\v]+/g;
/** Paragraph spacing for a paragraph whose source gave none (markdown, plain text, bare HTML). */
const DEFAULT_PARAGRAPH = { 'margin-top': '0', 'margin-bottom': '0.75em' };

// What may be kept, by kind of element.
const TEXT_PROPS = ['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant', 'font', 'text-decoration', 'text-decoration-line', 'text-decoration-color', 'text-decoration-style', 'text-transform', 'letter-spacing'];
const BOX_PROPS = ['text-align', 'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'text-indent', 'line-height', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-color', 'border-style', 'border-width'];
const PROPS = {
    inline: new Set(TEXT_PROPS),
    block: new Set([...TEXT_PROPS, ...BOX_PROPS]),
    // A page container's background is the page's theme, never the content's.
    container: new Set([...TEXT_PROPS, ...BOX_PROPS].filter((p) => p !== 'background-color')),
    cell: new Set([...TEXT_PROPS, ...BOX_PROPS, 'width', 'vertical-align']),
    table: new Set(['border', 'border-collapse', 'border-spacing', 'border-color', 'border-style', 'border-width', 'margin', 'margin-top', 'margin-bottom']),
    list: new Set([...TEXT_PROPS.filter((p) => p !== 'background-color'), 'margin', 'margin-top', 'margin-bottom', 'margin-left', 'padding', 'padding-left', 'list-style-type']),
    none: new Set<string>(),
};
const UNSAFE_VALUE = /url\s*\(|expression\s*\(|javascript:|vbscript:|behavior|@import|var\s*\(|[<>\\]/i;
const NO_VALUE = /^(initial|inherit|unset|revert|revert-layer)$/i;
const PLAIN_COLOR = /^(#[0-9a-f]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\)|[a-z]+)$/i;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeHtml(s).replace(/"/g, '&quot;');

type Declarations = Map<string, string>;

function parseDeclarations(css: string, into: Declarations = new Map()): Declarations {
    css.split(';').forEach((part) => {
        const colon = part.indexOf(':');
        if (colon < 1) return;
        const prop = part.slice(0, colon).trim().toLowerCase();
        const value = part.slice(colon + 1).replace(/!important/i, '').replace(/\s+/g, ' ').trim();
        if (prop && value) into.set(prop, value);
    });
    return into;
}

interface Rule { tag: string | null; cls: string | null; specificity: number; order: number; declarations: Declarations }

/** The simple rules (tag, .class, tag.class) of the clipboard's own <style> blocks - Word's class styles. */
function parseRules(doc: Document): Rule[] {
    const rules: Rule[] = [];
    doc.querySelectorAll('style').forEach((style) => {
        const css = (style.textContent || '').replace(/<!--|-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const matcher = /([^{}]+)\{([^{}]*)\}/g;
        let match: RegExpExecArray | null;
        while ((match = matcher.exec(css))) {
            const declarations = parseDeclarations(match[2]);
            match[1].split(',').forEach((raw) => {
                const selector = raw.trim();
                const simple = /^([a-z][a-z0-9]*)?(?:\.([\w-]+))?$/i.exec(selector);
                if (!selector || selector.startsWith('@') || !simple || (!simple[1] && !simple[2])) return;
                const tag = simple[1] ? simple[1].toLowerCase() : null;
                const cls = simple[2] || null;
                rules.push({ tag, cls, specificity: (cls ? 10 : 0) + (tag ? 1 : 0), order: rules.length, declarations });
            });
        }
    });
    return rules.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
}

/** Relative luminance (0 black - 1 white) of a CSS colour, or null when it cannot be read. */
function luminance(color: string): number | null {
    const value = color.trim().toLowerCase();
    let rgb: number[] | null = null;
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(value);
    if (hex) {
        const digits = hex[1].length === 3 ? hex[1].split('').map((d) => d + d).join('') : hex[1];
        rgb = [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
    }
    const fn = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(value);
    if (fn) rgb = [Number(fn[1]), Number(fn[2]), Number(fn[3])];
    if (['white', 'snow', 'ivory', 'ghostwhite', 'whitesmoke', 'floralwhite', 'mintcream', 'azure', 'aliceblue', 'seashell', 'honeydew'].includes(value)) rgb = [250, 250, 250];
    if (value === 'black') rgb = [0, 0, 0];
    if (!rgb) return null;
    return (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
}

const isLight = (color: string) => (luminance(color) ?? 0) > 0.85;

/** Whether a table was drawn without borders: an explicit border="0" and no cell border. */
function isPlainTable(table: Element): boolean {
    if (table.getAttribute('border') !== '0') return false;
    return !Array.from(table.querySelectorAll('td, th')).some((cell) => /border(-\w+)?\s*:\s*[^;]*\b(solid|dashed|dotted|double)\b/i.test(cell.getAttribute('style') || ''));
}

interface Context { background: boolean; pre: boolean; unwrapParagraphs: boolean }

// Marks where a paragraph unwrapped inside a list item or table cell ended.
const LINE_END = '\u0000';

function cleanHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rules = parseRules(doc);
    // Word marks its paragraphs with Mso* classes. Its Title is the top heading,
    // so its own headings sit one level below it.
    const fromWord = !!doc.querySelector('[class^="Mso"], [class*=" Mso"]');

    /** The element's own declared look: matching class rules, its attributes, then its inline style. */
    const declared = (el: Element): Declarations => {
        const result: Declarations = new Map();
        const tag = el.tagName.toLowerCase();
        const classes = (el.getAttribute('class') || '').split(/\s+/).filter(Boolean);
        rules.forEach((rule) => {
            if ((rule.tag && rule.tag !== tag) || (rule.cls && !classes.includes(rule.cls))) return;
            rule.declarations.forEach((value, prop) => result.set(prop, value));
        });
        const align = el.getAttribute('align');
        if (align && !(tag === 'div' && el.querySelector('table'))) result.set('text-align', align);
        const bgcolor = el.getAttribute('bgcolor');
        if (bgcolor) result.set('background-color', bgcolor);
        if (tag === 'font') {
            if (el.getAttribute('color')) result.set('color', el.getAttribute('color')!);
            if (el.getAttribute('face')) result.set('font-family', el.getAttribute('face')!);
        }
        parseDeclarations(el.getAttribute('style') || '', result);
        return result;
    };

    /** The kept part of a look, as a style attribute value; reports whether it holds a background. */
    const styleFor = (el: Element, allowed: Set<string>, ctx: Context, defaults?: Record<string, string>, inherited?: Declarations) => {
        const kept: Declarations = new Map();
        const own = declared(el);
        // Taken from the element's content where it gives none of its own (a cell's paragraph size).
        inherited?.forEach((value, prop) => { if (!own.has(prop)) own.set(prop, value); });
        own.forEach((value, prop) => {
            let name = prop;
            let val = value;
            if (prop === 'background') {
                // Only a plain colour; never an image or gradient.
                if (!PLAIN_COLOR.test(val)) return;
                name = 'background-color';
            }
            if (!allowed.has(name) || NO_VALUE.test(val) || UNSAFE_VALUE.test(val)) return;
            if (name === 'background-color' && /^(transparent|none)$/i.test(val)) return;
            kept.set(name, val.replace(/"/g, "'"));
        });
        const background = kept.has('background-color');
        // Near-white text with nothing behind it would vanish on the white page.
        const color = kept.get('color');
        if (color && isLight(color) && !background && !ctx.background) kept.delete('color');
        if (defaults) {
            if (!kept.has('margin') && !kept.has('margin-top')) kept.set('margin-top', defaults['margin-top']);
            if (!kept.has('margin') && !kept.has('margin-bottom')) kept.set('margin-bottom', defaults['margin-bottom']);
        }
        const css = Array.from(kept, ([p, v]) => `${p}:${v}`).join(';');
        return { attr: css ? ` style="${escapeAttr(css)}"` : '', background };
    };

    const isBlock = (node: Node | null) => !!node && node.nodeType === Node.ELEMENT_NODE && BLOCKS.has((node as Element).tagName.toLowerCase());
    const trimEdges = (s: string) => s.replace(/^ +/, '').replace(/ +$/, '');
    const children = (el: Node, ctx: Context) => Array.from(el.childNodes).map((n) => walk(n, ctx)).join('');
    /** A list item's or table cell's content: its paragraphs one per line, not as spaced paragraphs. */
    const lines = (html_: string) => html_
        .replace(new RegExp(`${LINE_END}+(?=<(ul|ol|table|pre|blockquote|h\\d|div|hr)[\\s>])`, 'g'), LINE_END)
        .replace(new RegExp(`${LINE_END}+$`), '')
        .replace(new RegExp(LINE_END, 'g'), '<br>');

    function walk(node: Node, ctx: Context): string {
        if (node.nodeType === Node.TEXT_NODE) {
            const raw = node.textContent || '';
            if (ctx.pre) return escapeHtml(raw);
            // Only collapsible whitespace between blocks (the source's indentation): nothing.
            if (!raw.replace(COLLAPSIBLE, '') && (!node.previousSibling || !node.nextSibling || isBlock(node.previousSibling) || isBlock(node.nextSibling))) return '';
            return escapeHtml(raw.replace(COLLAPSIBLE, ' '));
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (DROP.has(tag)) return '';
        if (tag === 'br') return '<br>';
        if (tag === 'hr') return '<hr>';

        if (tag === 'a') {
            const href = (el.getAttribute('href') || '').trim();
            if (!SAFE_LINK.test(href)) return children(el, ctx);
            const { attr } = styleFor(el, PROPS.inline, ctx);
            return inline(`a href="${escapeAttr(href)}" ${LINK_ATTRS}${attr}`, 'a', children(el, ctx));
        }
        if (INLINE[tag]) {
            if (tag === 'b' && NOT_BOLD.test(el.getAttribute('style') || '')) return children(el, ctx);
            // A code block is already monospace: its <code> adds nothing.
            if (tag === 'code' && ctx.pre) return children(el, ctx);
            const { attr, background } = styleFor(el, PROPS.inline, ctx);
            const inner = children(el, { ...ctx, background: ctx.background || background });
            const out = INLINE[tag];
            // A span with no look of its own is only its text.
            if (out === 'span' && !attr) return inner;
            return inline(`${out}${attr}`, out, inner);
        }

        const wordTitle = fromWord && tag === 'p' && /\bMsoTitle\b/.test(el.getAttribute('class') || '');
        if (HEADINGS.has(tag) || wordTitle) {
            const sourceLevel = wordTitle ? 0 : Number(tag.slice(1));
            const level = Math.min(Math.max(1, fromWord ? sourceLevel + 1 : sourceLevel), DEEPEST_HEADING);
            const { attr, background } = styleFor(el, PROPS.block, ctx);
            return `<h${level}${attr}>${trimEdges(children(el, { ...ctx, background: ctx.background || background }))}</h${level}>`;
        }
        if (tag === 'p' || (DIV_LIKE.has(tag) && !Array.from(el.children).some(isBlock))) {
            if (ctx.unwrapParagraphs) {
                // One line of a list item or cell: its spacing goes, its font stays.
                const { attr, background } = styleFor(el, PROPS.inline, ctx);
                const inner = trimEdges(children(el, { ...ctx, background: ctx.background || background }));
                return (attr && inner ? `<span${attr}>${inner}</span>` : inner) + LINE_END;
            }
            if (tag !== 'p') {
                // A line in a <div>: its own line, with no paragraph spacing added.
                const { attr, background } = styleFor(el, PROPS.container, ctx);
                const inner = trimEdges(children(el, { ...ctx, background: ctx.background || background }));
                return inner || attr ? `<div${attr}>${inner || '<br>'}</div>` : '';
            }
            const { attr, background } = styleFor(el, PROPS.block, ctx, DEFAULT_PARAGRAPH);
            const inner = trimEdges(children(el, { ...ctx, background: ctx.background || background }));
            // An empty paragraph (Word's spacing between clauses) keeps its line.
            const empty = !inner.replace(/<[^>]+>/g, '').trim() && !/<br>/.test(inner);
            return `<p${attr}>${empty ? '<br>' : inner}</p>`;
        }
        if (DIV_LIKE.has(tag)) {
            const { attr, background } = styleFor(el, PROPS.container, ctx);
            const inner = children(el, { ...ctx, background: ctx.background || background });
            return attr ? `<div${attr}>${inner}</div>` : inner;
        }
        if (tag === 'ul' || tag === 'ol') {
            const { attr } = styleFor(el, PROPS.list, ctx);
            return `<${tag}${attr}>${children(el, { ...ctx, unwrapParagraphs: false })}</${tag}>`;
        }
        if (tag === 'li' || tag === 'td' || tag === 'th') {
            // Its paragraphs become lines, so their size and line height move up to it:
            // a line box is as tall as the item's own font makes it.
            const firstParagraph = Array.from(el.children).find((c) => c.tagName.toLowerCase() === 'p');
            const inherited: Declarations = new Map();
            if (firstParagraph) {
                declared(firstParagraph).forEach((value, prop) => {
                    if (prop === 'line-height' || prop === 'font-size') inherited.set(prop, value);
                });
            }
            const { attr, background } = styleFor(el, tag === 'li' ? PROPS.block : PROPS.cell, ctx, undefined, inherited);
            const inner = children(el, { ...ctx, background: ctx.background || background, unwrapParagraphs: true });
            return `<${tag}${attr}>${trimEdges(lines(inner))}</${tag}>`;
        }
        if (tag === 'table') {
            const { attr } = styleFor(el, PROPS.table, ctx);
            const cls = isPlainTable(el) ? ` class="${PLAIN_TABLE_CLASS}"` : '';
            return `<table${cls}${attr}>${children(el, { ...ctx, unwrapParagraphs: false })}</table>`;
        }
        if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot' || tag === 'tr') {
            const out = tag === 'tfoot' ? 'tbody' : tag;
            return `<${out}>${children(el, ctx)}</${out}>`;
        }
        if (tag === 'blockquote') {
            const { attr, background } = styleFor(el, PROPS.block, ctx);
            return `<blockquote${attr}>${children(el, { ...ctx, background: ctx.background || background, unwrapParagraphs: false })}</blockquote>`;
        }
        if (tag === 'pre') {
            const { attr, background } = styleFor(el, PROPS.block, ctx);
            const inner = children(el, { ...ctx, background: ctx.background || background, pre: true });
            return `<pre${attr}>${inner.replace(/\n+$/, '')}</pre>`;
        }
        return children(el, ctx);
    }

    // An inline element ends: a space typed just before its end stays, outside it
    // ("<b>1.1. Purpose. </b>Company" keeps the space before "Company").
    function inline(open: string, close: string, inner: string): string {
        const trailing = / +$/.test(inner);
        return `<${open}>${inner.replace(/ +$/, '')}</${close}>${trailing ? ' ' : ''}`;
    }

    const out = children(doc.body, { background: false, pre: false, unwrapParagraphs: false });
    return trimEdges(lines(out));
}

// Text is escaped first, so the markup added here is the only markup there is.
const inlineMarkdown = (s: string) => escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // A URL may hold one level of brackets, e.g. a Wikipedia link.
    .replace(/\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_m, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>');

const tableCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inlineMarkdown(c.trim()));

/** Markdown (or plain text) to HTML; a single line break stays a line break. */
function markdownToHtml(text: string): string {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let quote: string[] = [];
    let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

    const endParagraph = () => { if (paragraph.length) html.push(`<p>${paragraph.join('<br>')}</p>`); paragraph = []; };
    const endQuote = () => { if (quote.length) html.push(`<blockquote><p>${quote.join('<br>')}</p></blockquote>`); quote = []; };
    const endList = () => { if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; };
    const endAll = () => { endParagraph(); endQuote(); endList(); };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
        const bullet = /^\s*[-*+•]\s+(.*)$/.exec(line);
        const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);
        const quoted = /^\s{0,3}>\s?(.*)$/.exec(line);

        if (/^\s*```/.test(line)) {
            endAll();
            const code: string[] = [];
            for (i += 1; i < lines.length && !/^\s*```/.test(lines[i]); i++) code.push(lines[i]);
            html.push(`<pre>${escapeHtml(code.join('\n'))}</pre>`);
            continue;
        }
        if (!line.trim()) { endAll(); continue; }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { endAll(); html.push('<hr>'); continue; }
        if (heading) {
            endAll();
            const level = Math.min(heading[1].length, DEEPEST_HEADING);
            html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
            continue;
        }
        if (quoted) { endParagraph(); endList(); quote.push(inlineMarkdown(quoted[1].trim())); continue; }
        if (line.trim().startsWith('|') && /^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(lines[i + 1] || '')) {
            endAll();
            const head = tableCells(line);
            const rows: string[][] = [];
            i += 2;
            while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(tableCells(lines[i++]));
            i -= 1;
            html.push(`<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>`
                + rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>');
            continue;
        }
        if (bullet || number) {
            const tag = bullet ? 'ul' : 'ol';
            endParagraph();
            endQuote();
            if (list && list.tag !== tag) endList();
            if (!list) list = { tag, items: [] };
            list.items.push(inlineMarkdown((bullet || number)![1]));
            continue;
        }
        endQuote();
        endList();
        paragraph.push(inlineMarkdown(line.trim()));
    }
    endAll();
    return html.join('');
}

export function pastedToHtml({ html, text }: { html?: string; text?: string }): string {
    if (html && html.trim()) return cleanHtml(html);
    return cleanHtml(markdownToHtml(text || ''));
}
