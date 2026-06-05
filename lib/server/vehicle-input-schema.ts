import { z } from 'zod'
import {
  parseVehicleIntegerValue,
  VEHICLE_INTEGER_LIMITS,
  type VehicleIntegerField,
} from '@/lib/vehicle-limits'

function vehicleIntegerSchema(field: VehicleIntegerField) {
  const config = VEHICLE_INTEGER_LIMITS[field]

  return z.union([z.string(), z.number()], {
    invalid_type_error: `${config.label} geçerli bir sayı olmalıdır.`,
    required_error: `${config.label} zorunludur.`,
  }).transform((value, context) => {
    const parsed = parseVehicleIntegerValue(field, value)
    if (!parsed.ok) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsed.message,
      })
      return z.NEVER
    }

    return parsed.value
  })
}

const baseVehicleSchema = z.object({
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  variant: z.string().trim().max(160).optional(),
  year: vehicleIntegerSchema('year'),
  price: vehicleIntegerSchema('price'),
  mileage: vehicleIntegerSchema('mileage'),
  fuel: z.string().trim().min(1).max(80),
  transmission: z.string().trim().min(1).max(80),
  color: z.string().trim().max(80).optional(),
  description: z.string().trim().max(3000).optional(),
  photos: z.array(z.string().trim().url().max(1500)).max(30).optional(),
})

export const createVehicleSchema = baseVehicleSchema.extend({
  bodyType: z.string().trim().max(80).optional(),
  engineSize: z.string().trim().max(80).optional(),
  horsePower: z.string().trim().max(80).optional(),
  plateNumber: z.string().trim().max(40).optional(),
  hasDamage: z.enum(['yes', 'no']).optional(),
  damageDetails: z.string().trim().max(1000).optional(),
  previousOwners: z.string().trim().max(20).optional(),
  serviceHistory: z.enum(['yes', 'partial', 'no']).optional(),
  warrantyStatus: z.enum(['yes', 'no']).optional(),
})

export const updateVehicleSchema = baseVehicleSchema
