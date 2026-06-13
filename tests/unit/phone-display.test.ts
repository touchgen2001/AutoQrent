import { describe, expect, it } from 'vitest'

import { formatTrPhoneDisplay } from '../../lib/phone-display'

describe('formatTrPhoneDisplay', () => {
  it('formats a normalized 0XXXXXXXXXX number as 0XXX XXX XX XX', () => {
    expect(formatTrPhoneDisplay('05551234567')).toBe('0555 123 45 67')
  })

  it('adds the missing leading zero for a 10-digit local number', () => {
    expect(formatTrPhoneDisplay('5551234567')).toBe('0555 123 45 67')
  })

  it('strips the 90 country code from a 12-digit number', () => {
    expect(formatTrPhoneDisplay('905551234567')).toBe('0555 123 45 67')
  })

  it('ignores spaces, plus signs and punctuation', () => {
    expect(formatTrPhoneDisplay('+90 555 123 45 67')).toBe('0555 123 45 67')
    expect(formatTrPhoneDisplay('0555-123-45-67')).toBe('0555 123 45 67')
  })

  it('returns an empty string for null, undefined or blank input', () => {
    expect(formatTrPhoneDisplay(null)).toBe('')
    expect(formatTrPhoneDisplay(undefined)).toBe('')
    expect(formatTrPhoneDisplay('')).toBe('')
    expect(formatTrPhoneDisplay('   ')).toBe('')
  })

  it('returns an empty string when there are no digits at all', () => {
    expect(formatTrPhoneDisplay('abc')).toBe('')
  })

  it('falls back to the trimmed raw value when it cannot be parsed confidently', () => {
    expect(formatTrPhoneDisplay('  12345 ')).toBe('12345')
  })
})
