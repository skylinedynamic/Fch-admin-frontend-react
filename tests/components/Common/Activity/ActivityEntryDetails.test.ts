import { describe, expect, it } from 'vitest'
import { entryDetails, isEmailEntry, isEventEntry } from '../../../../src/components/Common/Activity/ActivityEntryDetails'

const fmt = (v: string) => `formatted ${v}`

describe('ActivityEntryDetails - entryDetails', () => {
  it('an email lists its recipients and subject', () => {
    expect(entryDetails({ log_type_raw: 'email', to_emails: ['a@x.test', 'b@x.test'], subject: 'Hello' }, fmt)).toEqual([
      ['To', 'a@x.test, b@x.test'],
      ['Subject', 'Hello'],
    ])
  })

  it('accepts recipients as one string, and leaves out what is empty', () => {
    expect(entryDetails({ log_type: 'Email Sent', to_emails: 'a@x.test', subject: null }, fmt)).toEqual([['To', 'a@x.test']])
  })

  it('an event lists its type, date, assignee and recipients', () => {
    expect(entryDetails({
      log_type_raw: 'activity', reference: 'Meeting', activity_date: '2026-11-19 18:30:00',
      assigned_user: { id: 5, name: 'Sam' }, to_emails: null,
    }, fmt)).toEqual([
      ['Type', 'Meeting'],
      ['Date', 'formatted 2026-11-19 18:30:00'],
      ['Assigned to', 'Sam'],
    ])
  })

  it('any other entry has no details', () => {
    expect(entryDetails({ log_type_raw: 'lead_create', subject: 'x' }, fmt)).toEqual([])
    expect(isEmailEntry({ log_type_raw: 'lead_create' })).toBe(false)
    expect(isEventEntry({ log_type_raw: 'lead_create' })).toBe(false)
  })
})
