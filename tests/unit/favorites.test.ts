import { describe, expect, it } from 'vitest'

import {
  FAVORITES_I18N,
  FAVORITES_MAX,
  isValidSavedVehicle,
  type FavoritesLabels,
  type SavedVehicle,
} from '@/lib/favorites'
import { PUBLIC_LOCALES } from '@/lib/public-i18n'

const validRecord: SavedVehicle = {
  id: 'abc-123',
  title: '2021 BMW 320i',
  href: '/arac/abc-123',
  image: '/vehicles/x.jpg',
  priceLabel: '1.250.000 TL',
  yearLabel: '2021',
  mileageLabel: '45.000 km',
  fuelLabel: 'Benzin',
  transmissionLabel: 'Otomatik',
  bodyType: 'Sedan',
  savedAt: 1_700_000_000_000,
}

describe('isValidSavedVehicle', () => {
  it('accepts a well-formed record (incl. null image)', () => {
    expect(isValidSavedVehicle(validRecord)).toBe(true)
    expect(isValidSavedVehicle({ ...validRecord, image: null })).toBe(true)
  })

  it('rejects malformed / partial / non-object values', () => {
    expect(isValidSavedVehicle(null)).toBe(false)
    expect(isValidSavedVehicle('nope')).toBe(false)
    expect(isValidSavedVehicle({})).toBe(false)
    expect(isValidSavedVehicle({ ...validRecord, id: '' })).toBe(false)
    expect(isValidSavedVehicle({ ...validRecord, savedAt: 'soon' })).toBe(false)
    const withoutPrice: Record<string, unknown> = { ...validRecord }
    delete withoutPrice.priceLabel
    expect(isValidSavedVehicle(withoutPrice)).toBe(false)
  })

  it('is usable as an Array.filter guard to drop corrupt entries', () => {
    const mixed = [validRecord, null, { id: 'x' }, { ...validRecord, id: 'y' }]
    const clean = mixed.filter(isValidSavedVehicle)
    expect(clean.map((v) => v.id)).toEqual(['abc-123', 'y'])
  })
})

describe('FAVORITES_I18N', () => {
  const keys: (keyof FavoritesLabels)[] = [
    'open', 'addAria', 'removeAria', 'empty', 'emptyHint', 'list', 'compare',
    'clear', 'detail', 'price', 'year', 'mileage', 'fuel', 'transmission', 'body',
  ]

  it('defines a non-empty string for every key in every public locale', () => {
    for (const locale of PUBLIC_LOCALES) {
      const labels = FAVORITES_I18N[locale]
      expect(labels, `missing labels for ${locale}`).toBeDefined()
      for (const key of keys) {
        expect(typeof labels[key], `${locale}.${key}`).toBe('string')
        expect(labels[key].length, `${locale}.${key} empty`).toBeGreaterThan(0)
      }
    }
  })
})

describe('FAVORITES_MAX', () => {
  it('is a sane positive cap', () => {
    expect(FAVORITES_MAX).toBeGreaterThan(0)
    expect(FAVORITES_MAX).toBeLessThanOrEqual(200)
  })
})
