import { afterEach, describe, expect, it } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen } from '@testing-library/react'
import { MergeFieldsHint } from '../../../../../src/pages/settings/components/AgreementBuilder/MergeFieldsHint'

/**
 * The builder explains its blue fields once: they fill in by themselves with
 * each signer's (or your company's) details when the agreement is signed.
 */
afterEach(() => localStorage.clear())

describe('MergeFieldsHint', () => {
  it('explains the blue fields when the agreement has any', () => {
    render(<MergeFieldsHint hasMergeFields />)

    expect(screen.getByRole('note')).toHaveTextContent('Blue fields fill in by themselves')
  })

  it('stays hidden when the agreement has none', () => {
    render(<MergeFieldsHint hasMergeFields={false} />)

    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('can be dismissed, and stays dismissed', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MergeFieldsHint hasMergeFields />)

    await user.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    unmount()

    render(<MergeFieldsHint hasMergeFields />)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})
