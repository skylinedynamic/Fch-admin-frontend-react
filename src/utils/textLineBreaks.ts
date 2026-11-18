const HTML_TAG = /<\/?[a-z][^>]*>/i

/**
 * Plain text shown as HTML keeps its line breaks: each one becomes <br>. An
 * activity's "Status changed to ...\nNote: ..." then shows its note on its own
 * line. HTML is left as it is - its line breaks are only markup formatting.
 * Sanitize the result before rendering it.
 */
export const textLineBreaks = (text: string | null | undefined): string => {
  if (!text) return ''
  return HTML_TAG.test(text) ? text : text.replace(/\r?\n/g, '<br>')
}
