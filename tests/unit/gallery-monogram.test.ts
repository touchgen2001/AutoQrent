import { describe, expect, it } from 'vitest'

import { galleryInitials, galleryInitialsWithFallback } from '../../lib/gallery-monogram'

describe('galleryInitials', () => {
  it('returns empty string for missing input', () => {
    expect(galleryInitials('')).toBe('')
    expect(galleryInitials('   ')).toBe('')
    expect(galleryInitials(null)).toBe('')
    expect(galleryInitials(undefined)).toBe('')
  })

  it('takes the first two letters of a single word', () => {
    expect(galleryInitials('Mercedes')).toBe('ME')
    expect(galleryInitials('cebindegaleri')).toBe('CE')
  })

  it('takes the first letter of the first two words', () => {
    expect(galleryInitials('Auto Qrent')).toBe('AQ')
    expect(galleryInitials('  Cebinde   Galeri ')).toBe('CG')
    expect(galleryInitials('a b c')).toBe('AB')
  })

  it('uppercases with Turkish locale rules', () => {
    // dotless i -> dotted capital İ; dotted i stays correct
    expect(galleryInitials('istanbul')).toBe('İS')
    expect(galleryInitials('ışık oto')).toBe('IO')
  })

  it('strips symbols before deriving initials', () => {
    expect(galleryInitials('@@@')).toBe('')
    expect(galleryInitials('-Galeri')).toBe('GA')
    expect(galleryInitials('7/24 Servis')).toBe('7S')
  })
})

describe('galleryInitialsWithFallback', () => {
  it('falls back to the brand monogram when no initials can be derived', () => {
    expect(galleryInitialsWithFallback('')).toBe('CG')
    expect(galleryInitialsWithFallback('@@@')).toBe('CG')
    expect(galleryInitialsWithFallback(null)).toBe('CG')
  })

  it('returns derived initials when available', () => {
    expect(galleryInitialsWithFallback('Auto Qrent')).toBe('AQ')
    expect(galleryInitialsWithFallback('Mercedes')).toBe('ME')
  })
})
