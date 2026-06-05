import type { VehicleFuelType, VehicleTransmissionType } from '@/lib/vehicle-display'
import type { PublicShowroomThemeSettings } from '@/lib/public-showroom-theme'

export type PublicDealer = {
  id: string
  name: string
  slug: string
  logo: string | null
  phone: string
  whatsapp: string
  email: string
  websiteUrl: string
  address: string
  city: string
  district: string
  googleMapsUrl: string | null
  workingHours: {
    weekdays: string
    saturday: string
    sunday: string
  }
  socialMedia: {
    instagram?: string
    facebook?: string
    youtube?: string
    twitter?: string
  }
  publicTheme: PublicShowroomThemeSettings
}

export type PublicVehicleStatus = 'yayinda' | 'satildi' | 'rezerve' | 'taslak'

export type PublicVehicle = {
  id: string
  routeId: string
  title: string
  brand: string
  model: string
  variant: string
  year: number
  price: number
  mileage: number
  fuelType: VehicleFuelType
  transmission: VehicleTransmissionType
  bodyType: string
  color: string
  engineSize: string
  horsePower: string
  features: string[]
  description: string
  images: string[]
  status: PublicVehicleStatus
  views: number
  qrScans: number
  whatsappClicks: number
  phoneClicks: number
  featured: boolean
  createdAt: string
  updatedAt: string
}

export type PublicVehicleDetail = {
  routeId: string
  stockId: string
  brand: string
  model: string
  variant: string
  year: number
  price: number
  mileage: number
  fuel: string
  transmission: string
  color: string
  engineSize: string
  horsePower: string
  bodyType: string
  description: string
  features: string[]
  images: string[]
  gallery: {
    name: string
    slug: string
    logo: string | null
    phone: string
    whatsapp: string
    email: string
    address: string
    city: string
    district: string
    workingHours: string
  }
  status: {
    hasDamage: boolean | null
    serviceHistory: boolean | 'partial' | null
    warranty: boolean | null
    previousOwners: number | null
  }
}
