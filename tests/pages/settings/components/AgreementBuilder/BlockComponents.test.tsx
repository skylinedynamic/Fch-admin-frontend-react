import { describe, expect, it } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { BlockBody } from '../../../../../src/pages/settings/components/AgreementBuilder/BlockComponents'

const helpers = {
  onUpdate: () => {}, onDelete: () => {}, onMove: () => {}, onInsert: () => {},
  onSelect: () => {}, onFocused: () => {}, onBlurred: () => {}, selectedId: null, openFmForBlock: () => {},
}

const triggers = (kind: 'month' | 'year') =>
  document.querySelectorAll(`.fp-yd-trigger[data-kind="${kind}"]`)

describe('BlockBody date pickers', () => {
  it.each([
    ['date', 'a date field'],
    ['signature', 'a signature date'],
  ])('%s block: %s uses the shared month and year dropdowns', async (type) => {
    render(<BlockBody block={{ id: 'b1', type, fieldLabel: 'Label' } as any} helpers={helpers} />)

    await waitFor(() => {
      expect(triggers('year')).toHaveLength(1)
      expect(triggers('month')).toHaveLength(1)
    })
  })
})
