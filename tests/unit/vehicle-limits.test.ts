import { describe, expect, it } from 'vitest'
import {
  formatVehicleIntegerLimit,
  parseVehicleIntegerFields,
  parseVehicleIntegerValue,
} from '../../lib/vehicle-limits'

describe('parseVehicleIntegerValue', () => {
  it('accepts an in-range integer number', () => {
    expect(parseVehicleIntegerValue('year', 2020)).toEqual({ ok: true, value: 2020 })
  })

  it('parses numeric strings and trims whitespace', () => {
    expect(parseVehicleIntegerValue('price', '  150000 ')).toEqual({ ok: true, value: 150000 })
  })

  it('rejects empty strings as required', () => {
    const result = parseVehicleIntegerValue('mileage', '   ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('zorunludur')
  })

  it('rejects non-numeric / decimal strings', () => {
    const result = parseVehicleIntegerValue('price', '12.5')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('tam sayı')
  })

  it('rejects non-integer numbers', () => {
    expect(parseVehicleIntegerValue('price', 12.5).ok).toBe(false)
  })

  it('rejects non-finite numbers', () => {
    expect(parseVehicleIntegerValue('price', Number.POSITIVE_INFINITY).ok).toBe(false)
    expect(parseVehicleIntegerValue('price', Number.NaN).ok).toBe(false)
  })

  it('enforces the minimum bound', () => {
    const result = parseVehicleIntegerValue('year', 1979)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('en az')
  })

  it('enforces the maximum bound', () => {
    const result = parseVehicleIntegerValue('year', 2101)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('en fazla')
  })

  it('accepts the inclusive boundaries', () => {
    expect(parseVehicleIntegerValue('year', 1980).ok).toBe(true)
    expect(parseVehicleIntegerValue('year', 2100).ok).toBe(true)
    expect(parseVehicleIntegerValue('mileage', 0).ok).toBe(true)
  })

  it('rejects values below the zero floor', () => {
    expect(parseVehicleIntegerValue('mileage', -1).ok).toBe(false)
  })
})

describe('parseVehicleIntegerFields', () => {
  it('returns all parsed values when valid', () => {
    const result = parseVehicleIntegerFields({ year: '2020', price: 500000, mileage: '15000' })
    expect(result).toEqual({ ok: true, values: { year: 2020, price: 500000, mileage: 15000 } })
  })

  it('reports the first invalid field', () => {
    const result = parseVehicleIntegerFields({ year: 1900, price: 500000, mileage: 15000 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.field).toBe('year')
  })

  it('validates fields in declared order (price before mileage)', () => {
    const result = parseVehicleIntegerFields({ year: 2020, price: -5, mileage: -5 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.field).toBe('price')
  })
})

describe('formatVehicleIntegerLimit', () => {
  it('formats with tr-TR thousands separators', () => {
    expect(formatVehicleIntegerLimit(1000000)).toBe('1.000.000')
  })
})
