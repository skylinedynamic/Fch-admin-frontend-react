import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ApplyFormCodeField from '../../../../src/pages/cms/components/ApplyFormCodeField'

describe('ApplyFormCodeField help text', () => {
  it('states what an empty field does, and promises no default form', () => {
    render(<ApplyFormCodeField value="" onChange={vi.fn()} />)

    const help = screen.getByText(/copy embed html/i)

    expect(help).toHaveTextContent('If this is empty, the Apply page shows no application form')
    expect(help).toHaveTextContent("Regenerating the form's key has the same effect until the new code is pasted here.")
    expect(help).not.toHaveTextContent(/default/i)
  })
})
