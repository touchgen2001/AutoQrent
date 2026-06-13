#!/usr/bin/env node

import {
  parseVehicleIntegerFields,
  parseVehicleIntegerValue,
  VEHICLE_INTEGER_LIMITS,
} from '../../lib/vehicle-limits.ts'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function expectRejected(label, result, expectedText) {
  assert(!result.ok, `${label} should be rejected`)
  assert(result.message.includes(expectedText), `${label} should mention ${expectedText}`)
  return result.message
}

const validVehicleNumbers = parseVehicleIntegerFields({
  year: '2024',
  price: '2450000',
  mileage: '45000',
})

assert(validVehicleNumbers.ok, 'valid vehicle numeric fields should pass')
assert(validVehicleNumbers.ok && validVehicleNumbers.values.price === 2450000, 'price should parse as integer')
assert(validVehicleNumbers.ok && validVehicleNumbers.values.mileage === 45000, 'mileage should parse as integer')

const hugePriceRejection = expectRejected(
  'huge price',
  parseVehicleIntegerValue('price', '45433545432435460'),
  'en fazla',
)
const hugeMileageRejection = expectRejected(
  'huge mileage',
  parseVehicleIntegerValue('mileage', '45433545432435460'),
  'en fazla',
)
const decimalMileageRejection = expectRejected(
  'decimal mileage',
  parseVehicleIntegerValue('mileage', '123.5'),
  'tam sayı',
)
const unsafeNumberRejection = expectRejected(
  'unsafe number',
  parseVehicleIntegerValue('price', Number.MAX_SAFE_INTEGER + 1),
  'en fazla',
)

assert(
  parseVehicleIntegerValue('mileage', VEHICLE_INTEGER_LIMITS.mileage.max).ok,
  'mileage max boundary should pass',
)
assert(
  !parseVehicleIntegerValue('mileage', VEHICLE_INTEGER_LIMITS.mileage.max + 1).ok,
  'mileage above max boundary should fail',
)

console.log(
  JSON.stringify(
    {
      ok: true,
      accepted: validVehicleNumbers.ok ? validVehicleNumbers.values : null,
      rejected: {
        hugePrice: hugePriceRejection,
        hugeMileage: hugeMileageRejection,
        decimalMileage: decimalMileageRejection,
        unsafeNumber: unsafeNumberRejection,
      },
      limits: VEHICLE_INTEGER_LIMITS,
    },
    null,
    2,
  ),
)
