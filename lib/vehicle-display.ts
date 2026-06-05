export type VehicleFuelType = 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit' | 'bilinmiyor'
export type VehicleTransmissionType = 'manuel' | 'otomatik' | 'yari-otomatik' | 'bilinmiyor'

export const carBrands = [
  'Audi',
  'BMW',
  'Chevrolet',
  'Citroen',
  'Dacia',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Jeep',
  'Kia',
  'Land Rover',
  'Mazda',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Opel',
  'Peugeot',
  'Porsche',
  'Renault',
  'Seat',
  'Skoda',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Volkswagen',
  'Volvo',
] as const

export function formatPrice(price: number, currency: string = 'TRY') {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function formatMileage(km: number) {
  return `${new Intl.NumberFormat('tr-TR').format(km)} km`
}

export function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function normalizeFuelType(value: string): VehicleFuelType {
  const normalized = value.trim().toLowerCase()

  if (normalized.includes('benzin')) return 'benzin'
  if (normalized.includes('dizel') || normalized.includes('diesel')) return 'dizel'
  if (normalized.includes('lpg')) return 'lpg'
  if (normalized.includes('elektrik') || normalized.includes('electric')) return 'elektrik'
  if (normalized.includes('hibrit') || normalized.includes('hybrid')) return 'hibrit'

  return 'bilinmiyor'
}

export function normalizeTransmission(value: string): VehicleTransmissionType {
  const normalized = value.trim().toLowerCase()

  if (normalized.includes('yari') || normalized.includes('yarı') || normalized.includes('semi')) {
    return 'yari-otomatik'
  }
  if (normalized.includes('otomatik') || normalized.includes('automatic') || normalized === 'auto') {
    return 'otomatik'
  }
  if (normalized.includes('manuel') || normalized.includes('manual')) {
    return 'manuel'
  }

  return 'bilinmiyor'
}

export function getFuelTypeLabel(fuel: VehicleFuelType): string {
  const labels: Record<VehicleFuelType, string> = {
    benzin: 'Benzin',
    dizel: 'Dizel',
    lpg: 'LPG',
    elektrik: 'Elektrik',
    hibrit: 'Hibrit',
    bilinmiyor: 'Bilinmiyor',
  }

  return labels[fuel]
}

export function getTransmissionLabel(transmission: VehicleTransmissionType): string {
  const labels: Record<VehicleTransmissionType, string> = {
    manuel: 'Manuel',
    otomatik: 'Otomatik',
    'yari-otomatik': 'Yari Otomatik',
    bilinmiyor: 'Bilinmiyor',
  }

  return labels[transmission]
}
