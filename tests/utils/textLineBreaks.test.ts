import { describe, expect, it } from 'vitest'
import { textLineBreaks } from '../../src/utils/textLineBreaks'

describe('textLineBreaks', () => {
  it('turns the line breaks of plain text into <br>', () => {
    expect(textLineBreaks('Status changed to Closed (Completed).\nNote: funded in full')).toBe('Status changed to Closed (Completed).<br>Note: funded in full')
    expect(textLineBreaks('one\r\ntwo')).toBe('one<br>two')
  })

  it('leaves HTML as it is: its line breaks are only markup formatting', () => {
    const html = '<p>Hello</p>\n<p>World</p>'
    expect(textLineBreaks(html)).toBe(html)
  })

  it('passes empty values through', () => {
    expect(textLineBreaks(null)).toBe('')
    expect(textLineBreaks(undefined)).toBe('')
    expect(textLineBreaks('')).toBe('')
  })
})
