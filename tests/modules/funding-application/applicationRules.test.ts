import { describe, expect, it } from 'vitest'
import { PURPOSE_NOTE_MAX_LENGTH } from '../../../src/modules/funding-application/applicationRules'

/** R2 BUG-032 - the Purpose Note limit is the API's (max:500). */
describe('PURPOSE_NOTE_MAX_LENGTH', () => {
  it('is 500', () => {
    expect(PURPOSE_NOTE_MAX_LENGTH).toBe(500)
  })
})
