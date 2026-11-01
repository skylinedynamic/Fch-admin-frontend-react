import { AGREEMENT_MERGE_FIELDS, mergeFieldToken } from '../../../../config/agreementMergeFields';

/**
 * Merge fields in the builder's canvas: a {{signer.name}} in a text block shows
 * as a labelled chip ("Signer's name") that can't be half-deleted, and is saved
 * back as the bare {{signer.name}} the server fills (fch-api AgreementMergeFields).
 */
const CHIP_CLASS = 'ab4-merge-chip';
const TOKEN = /\{\{\s*([a-z_.]+)\s*\}\}/g;
const labels = new Map(AGREEMENT_MERGE_FIELDS.map((f) => [f.key, f.label]));

export const createMergeChip = (key: string, doc: Document = document): HTMLSpanElement => {
    const chip = doc.createElement('span');
    chip.className = CHIP_CLASS;
    chip.setAttribute('contenteditable', 'false');
    chip.setAttribute('data-merge', key);
    chip.title = `Filled in automatically with ${(labels.get(key) ?? key).replace(/^Your /, 'your ').replace(/^Signer/, 'the signer').replace(/^Today/, 'today')} when the agreement is signed (${mergeFieldToken(key)}). Click to change.`;
    chip.textContent = labels.get(key) ?? key;
    return chip;
};

/** Known merge fields in the text (not inside tags) become chips. */
export const decorateMergeFields = (html: string): string => {
    if (!html.includes('{{')) return html;
    const root = document.createElement('div');
    root.innerHTML = html;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts: Text[] = [];
    while (walker.nextNode()) texts.push(walker.currentNode as Text);

    texts.forEach((text) => {
        const value = text.nodeValue || '';
        if (!TOKEN.test(value)) return;
        TOKEN.lastIndex = 0;
        const fragment = document.createDocumentFragment();
        let last = 0;
        value.replace(TOKEN, (token, key: string, at: number) => {
            fragment.appendChild(document.createTextNode(value.slice(last, at)));
            fragment.appendChild(labels.has(key) ? createMergeChip(key) : document.createTextNode(token));
            last = at + token.length;
            return token;
        });
        fragment.appendChild(document.createTextNode(value.slice(last)));
        text.replaceWith(fragment);
    });

    return root.innerHTML;
};

/** Chips go back to bare merge fields; everything else is left as it is. */
export const undecorateMergeFields = (html: string): string => {
    if (!html.includes(CHIP_CLASS)) return html;
    const root = document.createElement('div');
    root.innerHTML = html;
    root.querySelectorAll(`.${CHIP_CLASS}[data-merge]`).forEach((chip) => {
        chip.replaceWith(document.createTextNode(mergeFieldToken(chip.getAttribute('data-merge') || '')));
    });
    return root.innerHTML;
};
