export type VehicleIntegerField = 'year' | 'price' | 'mileage'

export const VEHICLE_INTEGER_LIMITS: Record<
  VehicleIntegerField,
  {
    label: string
    min: number
    max: number
    unit?: string
  }
> = {
  year: {
    label: 'Model yılı',
    min: 1980,
    max: 2100,
  },
  price: {
    label: 'Fiyat',
    min: 0,
    max: 100_000_000_000,
    unit: 'TL',
  },
  mileage: {
    label: 'Kilometre',
    min: 0,
    max: 5_000_000,
    unit: 'km',
  },
}

export type VehicleIntegerParseResult =
  | {
      ok: true
      value: number
    }
  | {
      ok: false
      message: string
    }

export type VehicleIntegerFieldsParseResult =
  | {
      ok: true
      values: Record<VehicleIntegerField, number>
    }
  | {
      ok: false
      field: VehicleIntegerField
      message: string
    }

export function formatVehicleIntegerLimit(value: number) {
  return new Intl.NumberFormat('tr-TR').format(value)
}

function buildLimitText(field: VehicleIntegerField, value: number) {
  const config = VEHICLE_INTEGER_LIMITS[field]
  return `${formatVehicleIntegerLimit(value)}${config.unit ? ` ${config.unit}` : ''}`
}

export function parseVehicleIntegerValue(
  field: VehicleIntegerField,
  rawValue: unknown,
): VehicleIntegerParseResult {
  const config = VEHICLE_INTEGER_LIMITS[field]

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim()
    if (!trimmed) {
      return { ok: false, message: `${config.label} zorunludur.` }
    }

    if (!/^[0-9]+$/.test(trimmed)) {
      return { ok: false, message: `${config.label} sadece tam sayı olarak girilmelidir.` }
    }

    rawValue = Number(trimmed)
  }

  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return { ok: false, message: `${config.label} geçerli bir sayı olmalıdır.` }
  }

  if (!Number.isInteger(rawValue)) {
    return { ok: false, message: `${config.label} tam sayı olmalıdır.` }
  }

  if (rawValue < config.min) {
    return { ok: false, message: `${config.label} en az ${buildLimitText(field, config.min)} olmalıdır.` }
  }

  if (rawValue > config.max) {
    return { ok: false, message: `${config.label} en fazla ${buildLimitText(field, config.max)} olabilir.` }
  }

  if (!Number.isSafeInteger(rawValue)) {
    return { ok: false, message: `${config.label} güvenli sayı sınırını aşıyor.` }
  }

  return { ok: true, value: rawValue }
}

export function parseVehicleIntegerFields(input: Record<VehicleIntegerField, unknown>): VehicleIntegerFieldsParseResult {
  const values = {} as Record<VehicleIntegerField, number>
  const fields: VehicleIntegerField[] = ['year', 'price', 'mileage']

  for (const field of fields) {
    const parsed = parseVehicleIntegerValue(field, input[field])
    if (!parsed.ok) {
      return {
        ok: false,
        field,
        message: parsed.message,
      }
    }

    values[field] = parsed.value
  }

  return { ok: true, values }
}
