import DOMPurify from 'dompurify';

// Links written in the editor open in a new tab; keep that, without handing
// the opened page a handle on this one.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node instanceof HTMLAnchorElement && node.getAttribute('target') === '_blank') {
        node.setAttribute('rel', 'noopener noreferrer');
    }
});

/**
 * Makes stored HTML (activity descriptions, notes, appointment and reminder
 * text) safe for dangerouslySetInnerHTML: keeps formatting, drops anything that
 * can run script - <script>, on* handlers, javascript: links, iframes (BUG-004).
 * Use it on every user- or API-supplied HTML string before rendering it.
 */
export const sanitizeHtml = (html: string | null | undefined): string =>
    html ? DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) : '';
