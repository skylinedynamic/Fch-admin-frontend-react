import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
// @ts-ignore - BlockComponents is untyped JSX-in-TSX
import { TextBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'
import { makeBlock } from '../../../../../src/pages/settings/components/AgreementBuilder/utils'

vi.mock('react-toastify', () => ({ toast: { warn: vi.fn(), success: vi.fn(), error: vi.fn() } }))

/**
 * BUG-004 (QA round 2): stored HTML is rendered as HTML, so it must not run
 * script. A read-only agreement snapshot keeps its formatting only.
 */
describe('TextBlock - a read-only snapshot cannot run script (BUG-004)', () => {
  it('keeps the formatting and drops the onerror handler', () => {
    const block = { ...makeBlock('text'), content: '<p><b>Terms</b> apply <img src=x onerror="window.__xss = 1"></p>' }
    const view = render(<TextBlock block={block} onUpdate={() => {}} onFocused={() => {}} onBlurred={() => {}} readOnly />)

    expect(screen.getByText('Terms').tagName).toBe('B')
    expect(view.container.querySelector('[onerror]')).toBeNull()
  })
})
