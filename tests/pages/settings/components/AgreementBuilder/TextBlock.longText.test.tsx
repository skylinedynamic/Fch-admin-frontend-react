import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
import { toast } from 'react-toastify'
// @ts-ignore - BlockComponents is untyped JSX-in-TSX
import { TextBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

vi.mock('react-toastify', () => ({ toast: { warn: vi.fn(), success: vi.fn(), error: vi.fn() } }))

/**
 * A text block takes any amount of text: what does not fit its page flows on
 * to the next one (pagination.ts), so typing or pasting is never refused.
 * Pasted text keeps its structure (bold, lists, paragraphs) but not the source's fonts and colours.
 */
const execCommand = vi.fn(() => true)
document.execCommand = execCommand as unknown as typeof document.execCommand

const heights = new Map<Element, number>()
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get() { return heights.get(this) ?? 0 },
})

afterEach(() => {
  heights.clear()
  execCommand.mockClear()
  vi.mocked(toast.warn).mockClear()
})

/** A page holding the text block and one other block of the given height. */
const renderOnPage = (otherHeight: number) => {
  const onUpdate = vi.fn()
  const page = document.createElement('div')
  page.className = 'ab4-doc'
  const own = document.createElement('div')
  own.className = 'ab4-block'
  const other = document.createElement('div')
  other.className = 'ab4-block'
  page.append(own, other)
  document.body.appendChild(page)
  heights.set(other, otherHeight)
  heights.set(own, 40)

  const block = { ...makeBlock('text'), id: 't1', content: 'Loan terms' }
  render(<TextBlock block={block} onUpdate={onUpdate} onFocused={vi.fn()} onBlurred={vi.fn()} />, { container: own })
  const editor = own.querySelector('.ab4-editor') as HTMLElement
  return { onUpdate, editor, own, cleanup: () => page.remove() }
}

describe('TextBlock with long text', () => {
  it('keeps typing that runs past the end of the page', () => {
    const { onUpdate, editor, own, cleanup } = renderOnPage(300)

    heights.set(own, 2400)
    editor.innerHTML = 'Loan terms and a very long paragraph'
    fireEvent.input(editor)

    expect(toast.warn).not.toHaveBeenCalled()
    expect(execCommand).not.toHaveBeenCalledWith('undo')
    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Loan terms and a very long paragraph' })
    cleanup()
  })

  it('pastes text copied from a chat or document with its bold, lists and paragraphs, but not its styles', () => {
    const { onUpdate, editor, cleanup } = renderOnPage(300)
    const range = document.createRange()
    range.selectNodeContents(editor)
    range.collapse(false)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)

    const html = '<p style="font-family:Calibri;color:red">: clause one</p><p>Clause <b>two</b></p><ul><li>one</li></ul>'
    fireEvent.paste(editor, {
      clipboardData: { getData: (type: string) => (type === 'text/html' ? html : ': clause one'), types: ['text/html', 'text/plain'] },
    })

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Loan terms: clause one\n\nClause <strong>two</strong>\n\n<ul><li>one</li></ul>' })
    expect(editor.querySelector('[style]')).toBeNull()
    cleanup()
  })

  it('pastes markdown from a chat copy button as formatted text', () => {
    const { onUpdate, editor, cleanup } = renderOnPage(300)

    fireEvent.paste(editor, {
      clipboardData: { getData: (type: string) => (type === 'text/plain' ? '\n## Fees\r\nNo **hidden** fees.' : ''), types: ['text/plain'] },
    })

    expect(onUpdate).toHaveBeenLastCalledWith({ content: 'Loan terms<strong>Fees</strong>\nNo <strong>hidden</strong> fees.' })
    cleanup()
  })
})
