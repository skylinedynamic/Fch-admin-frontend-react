/**
 * Turns pasted content (from ChatGPT, Claude, Word, a web page, or markdown
 * from an AI chat's "Copy" button) into the small HTML a text block holds:
 * bold, italics, underline, lists, tables and line breaks - none of the
 * source's fonts, colours, classes, links, images or scripts. Blocks show text
 * with white-space: pre-wrap, so paragraphs are separated by line breaks.
 */

const INLINE: Record<string, string> = { b: 'strong', strong: 'strong', i: 'em', em: 'em', u: 'u' };
const DROP = new Set(['script', 'style', 'meta', 'link', 'title', 'head', 'img', 'svg', 'button', 'input', 'select', 'textarea', 'iframe', 'object', 'video', 'audio', 'canvas', 'noscript', 'template']);
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const BLOCK_END = /<\/(ul|ol|table)>$/;
// Just inside a list, table or item: nothing before the content needs a break.
const CLOSED = /<\/(ul|ol|li|table|thead|tbody|tr|td|th)>$/;
const OPENED = /<(ul|ol|li|table|thead|tbody|tr|td|th)>$/;

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function cleanHtml(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let out = '';
    // Line breaks owed before the next content: 1 = new line, 2 = blank line between paragraphs.
    let pending = 0;
    let inCell = false;
    let inPre = false;

    const need = (n: number) => { if (out) pending = Math.max(pending, n); };
    // Whatever follows a list or table starts its own line; a break just before one is absorbed.
    const flush = () => {
        if (!pending) return;
        out = out.replace(/ +$/, '');
        if (OPENED.test(out)) { pending = 0; return; }
        const count = BLOCK_END.test(out) ? pending - 1 : pending;
        out += (inCell ? '<br>' : '\n').repeat(Math.max(0, count));
        pending = 0;
    };
    const atLineStart = () => !out || out.endsWith('\n') || out.endsWith('<br>') || OPENED.test(out) || CLOSED.test(out);

    const children = (el: Node) => el.childNodes.forEach(walk);

    // A list or table: its items hold only their own content, never the breaks around them.
    const container = (tag: string, el: Element, cellMode = false) => {
        flush();
        out += `<${tag}>`;
        const wasCell = inCell;
        if (cellMode) inCell = true;
        children(el);
        inCell = wasCell;
        pending = 0;
        out = out.replace(/ +$/, '') + `</${tag}>`;
    };

    function walk(node: Node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent || '';
            if (!inPre) {
                text = text.replace(/\s+/g, ' ');
                if (text === ' ' && (pending || atLineStart())) return;
            }
            flush();
            if (!inPre && atLineStart()) text = text.replace(/^ +/, '');
            out += escapeHtml(text);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as Element;
        const tag = el.tagName.toLowerCase();
        if (DROP.has(tag)) return;

        if (tag === 'br') { pending += 1; return; }
        if (tag === 'hr') { need(2); return; }
        if (INLINE[tag]) {
            // Google Docs wraps a whole copy in <b style="font-weight:normal">.
            if (tag === 'b' && /font-weight\s*:\s*(normal|400)/i.test(el.getAttribute('style') || '')) { children(el); return; }
            flush();
            out += `<${INLINE[tag]}>`;
            children(el);
            out = out.replace(/ +$/, '') + `</${INLINE[tag]}>`;
            return;
        }
        if (HEADINGS.has(tag)) {
            need(2);
            flush();
            out += '<strong>';
            children(el);
            out = out.replace(/ +$/, '') + '</strong>';
            need(1);
            return;
        }
        if (tag === 'ul' || tag === 'ol') { container(tag, el); need(2); return; }
        if (tag === 'li') { container('li', el); return; }
        if (tag === 'table') { container('table', el); need(2); return; }
        if (tag === 'thead' || tag === 'tbody' || tag === 'tr') { container(tag, el); return; }
        if (tag === 'tfoot') { container('tbody', el); return; }
        if (tag === 'th' || tag === 'td') { container(tag, el, true); return; }
        if (tag === 'pre') {
            need(2);
            flush();
            inPre = true;
            children(el);
            inPre = false;
            need(2);
            return;
        }
        if (['p', 'div', 'section', 'article', 'blockquote', 'header', 'footer', 'main', 'aside', 'figure', 'dl', 'dt', 'dd', 'address'].includes(tag)) {
            need(1);
            children(el);
            need(tag === 'div' ? 1 : 2);
            return;
        }
        children(el);
    }

    children(doc.body);
    return out.replace(/ +$/, '');
}

const inlineMarkdown = (s: string) => escapeHtml(s)
    .replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_m, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '$1');

const tableCells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => inlineMarkdown(c.trim()));

/** Markdown (or plain text) to the HTML cleanHtml reads; a single line break stays a line break. */
function markdownToHtml(text: string): string {
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const html: string[] = [];
    let paragraph: string[] = [];
    let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;

    const endParagraph = () => { if (paragraph.length) html.push(`<p>${paragraph.join('<br>')}</p>`); paragraph = []; };
    const endList = () => { if (list) html.push(`<${list.tag}>${list.items.map((i) => `<li>${i}</li>`).join('')}</${list.tag}>`); list = null; };
    const endAll = () => { endParagraph(); endList(); };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const heading = /^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
        const bullet = /^\s*[-*+•]\s+(.*)$/.exec(line);
        const number = /^\s*\d+[.)]\s+(.*)$/.exec(line);

        if (!line.trim()) { endAll(); continue; }
        if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { endAll(); html.push('<hr>'); continue; }
        if (heading) { endAll(); html.push(`<h3>${inlineMarkdown(heading[1])}</h3>`); continue; }
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
            if (list && list.tag !== tag) endList();
            if (!list) list = { tag, items: [] };
            list.items.push(inlineMarkdown((bullet || number)![1]));
            continue;
        }
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
