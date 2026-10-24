import { describe, expect, it } from 'vitest'
import {
  formatPhoneNumber,
  formatZipCode,
  formatDUNS,
  formatBusinessEIN,
  formatSSN,
  formatDate,
  parseDate,
  normalizeDate,
  formatSpeedToFunds,
} from '../../src/utils/formatters.js'

describe('formatPhoneNumber', () => {
  it('formats as (###) ###-####', () => {
    expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890')
  })

  it('returns the falsy value unchanged when empty', () => {
    expect(formatPhoneNumber('')).toBe('')
  })
})

describe('formatZipCode / formatDUNS', () => {
  it('keeps only digits, capped at the right length', () => {
    expect(formatZipCode('12345-6789')).toBe('12345')
    expect(formatDUNS('12-345-6789-extra')).toBe('123456789')
  })
})

describe('formatBusinessEIN', () => {
  it('formats as XX-XXXXXXX', () => {
    expect(formatBusinessEIN('123456789')).toBe('12-3456789')
  })

  it('does not insert a dash for 2 or fewer digits', () => {
    expect(formatBusinessEIN('1')).toBe('1')
  })
})

describe('formatSSN — masks by default, reveals only when asked (PII, admin-facing)', () => {
  it('masks to only the last 4 digits by default', () => {
    expect(formatSSN('123456789')).toBe('***-**-6789')
  })

  it('reveals the full SSN only when reveal=true is explicitly passed', () => {
    expect(formatSSN('123456789', true)).toBe('123-45-6789')
  })

  it('returns an em dash placeholder for empty input', () => {
    expect(formatSSN('')).toBe('—')
  })

  it('pads with * when fewer than 4 digits are available, even when masked', () => {
    expect(formatSSN('67')).toBe('***-**-**67')
  })
})

describe('formatDate', () => {
  it('formats an ISO date into a human-readable string', () => {
    expect(formatDate('2026-01-15')).toBe('January 15, 2026')
  })

  it('returns an em dash placeholder for empty input', () => {
    expect(formatDate('')).toBe('—')
  })
})

describe('parseDate', () => {
  it('parses YYYY-MM-DD', () => {
    const d = parseDate('2026-01-15')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(0)
    expect(d?.getDate()).toBe(15)
  })

  it('parses MM/DD/YYYY (US format, day <= 12 ambiguous case resolved as month-first)', () => {
    const d = parseDate('01/15/2026')
    expect(d?.getFullYear()).toBe(2026)
    expect(d?.getMonth()).toBe(0)
    expect(d?.getDate()).toBe(15)
  })

  it('returns null for empty input', () => {
    expect(parseDate('')).toBeNull()
  })
})

describe('normalizeDate', () => {
  it('converts YYYY-MM-DD to MM-DD-YYYY', () => {
    expect(normalizeDate('2026-01-15')).toBe('01-15-2026')
  })

  it('leaves an already MM-DD-YYYY string normalized', () => {
    expect(normalizeDate('1-5-2026')).toBe('01-05-2026')
  })
})

/**
 * BUG-025 (CP-FUND-07): "1-5 Days Days". Speed to funds is free text that
 * usually has its own unit; " Days" was appended anyway. The client's funding
 * detail here had the same code as the borrower portal.
 */
describe('formatSpeedToFunds', () => {
  it.each([
    ['1-5 Days', '1-5 Days'],
    ['24-72 Hours', '24-72 Hours'],
    ['1-5', '1-5 Days'],
    ['7', '7 Days'],
    ['1-5 Days Days', '1-5 Days'],
  ])('%s -> %s', (value, expected) => {
    expect(formatSpeedToFunds(value)).toBe(expected)
  })

  it('returns the fallback when there is no value', () => {
    expect(formatSpeedToFunds(null)).toBe('—')
    expect(formatSpeedToFunds('', 'n/a')).toBe('n/a')
  })
})
