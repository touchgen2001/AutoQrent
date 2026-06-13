import type { PublicDealer, PublicVehicle, PublicVehicleDetail } from '@/lib/public-catalog-types'
import { absoluteUrl } from '@/lib/seo'

export const DEMO_SHOWROOM_SLUG = 'cebindegaleri-demo-galeri-11111111111111111111111111111111'
export const DEMO_VEHICLE_ROUTE_ID = 'demo-mercedes-amg-gt-coupe-22222222222222222222222222222222'
const DEMO_LEGACY_VEHICLE_ROUTE_IDS = ['demo-bmw-320i-m-sport-22222222222222222222222222222222']
export const DEMO_GALLERY_ID = 'demo-gallery-cebindegaleri'
export const DEMO_VEHICLE_ID = 'demo-vehicle-mercedes-amg-gt'

export const DEMO_PUBLIC_DEALER: PublicDealer = {
  id: DEMO_GALLERY_ID,
  name: 'Cebindegaleri Demo Galeri',
  slug: DEMO_SHOWROOM_SLUG,
  logo: '/demo-gallery-logo.svg',
  phone: '0530 973 82 40',
  whatsapp: '905309738240',
  email: 'demo@cebindegaleri.com',
  websiteUrl: 'https://cebindegaleri.com/demo',
  address: 'Demo showroom deneyimi, Istanbul',
  city: 'Istanbul',
  district: 'Demo',
  googleMapsUrl: 'https://www.google.com/maps?q=Istanbul',
  workingHours: {
    weekdays: '09:00 - 19:00',
    saturday: '10:00 - 18:00',
    sunday: 'Randevu ile',
  },
  socialMedia: {},
  publicTheme: {
    theme: 'premium',
    accentColor: '#2f2d2c',
    backgroundStyle: 'warm',
    heroTagline: 'Premium ikinci el deneyimi',
    heroNote:
      'Bu sayfa demo deneyimi icin hazirlanmistir. Galeri sahipleri kendi logosu, iletisim bilgileri, araclari ve QR linkleriyle ayni yapida yayin yapar.',
  },
}

export const DEMO_PUBLIC_VEHICLE: PublicVehicle = {
  id: DEMO_VEHICLE_ID,
  routeId: DEMO_VEHICLE_ROUTE_ID,
  title: 'Mercedes-AMG GT Coupe Demo',
  brand: 'Mercedes-Benz',
  model: 'AMG GT',
  variant: 'Coupe',
  year: 2022,
  price: 6500000,
  mileage: 18200,
  fuelType: 'benzin',
  transmission: 'otomatik',
  bodyType: 'Coupe',
  color: 'Mat Siyah',
  engineSize: '4.0 V8',
  horsePower: 'AMG GT Serisi',
  features: [
    'Mat siyah dis gorunum',
    'Spor coupe kasa',
    'Otomatik sanziman',
    'Mobil arac detay sayfasi',
    'QR ile musteri yonlendirme',
  ],
  description:
    'Demo arac sayfasi; QR okutan musterinin arac fotografi, fiyat, teknik bilgi, iletisim ve talep formunu nasil gordugunu gostermek icin hazirlanmistir.',
  images: ['/vehicles/demo-mercedes-amg-gt-1.jpg', '/vehicles/demo-mercedes-amg-gt-2.jpg'],
  status: 'yayinda',
  views: 0,
  qrScans: 0,
  whatsappClicks: 0,
  phoneClicks: 0,
  featured: true,
  createdAt: '2026-06-05T00:00:00.000Z',
  updatedAt: '2026-06-05T00:00:00.000Z',
}

export const DEMO_PUBLIC_VEHICLE_DETAIL: PublicVehicleDetail = {
  routeId: DEMO_VEHICLE_ROUTE_ID,
  stockId: DEMO_VEHICLE_ROUTE_ID,
  favoriteCount: 7,
  brand: DEMO_PUBLIC_VEHICLE.brand,
  model: DEMO_PUBLIC_VEHICLE.model,
  variant: DEMO_PUBLIC_VEHICLE.variant,
  year: DEMO_PUBLIC_VEHICLE.year,
  price: DEMO_PUBLIC_VEHICLE.price,
  mileage: DEMO_PUBLIC_VEHICLE.mileage,
  fuel: 'Benzin',
  transmission: 'Otomatik',
  color: DEMO_PUBLIC_VEHICLE.color,
  engineSize: DEMO_PUBLIC_VEHICLE.engineSize,
  horsePower: DEMO_PUBLIC_VEHICLE.horsePower,
  bodyType: DEMO_PUBLIC_VEHICLE.bodyType,
  description: DEMO_PUBLIC_VEHICLE.description,
  features: DEMO_PUBLIC_VEHICLE.features,
  images: DEMO_PUBLIC_VEHICLE.images,
  gallery: {
    name: DEMO_PUBLIC_DEALER.name,
    slug: DEMO_PUBLIC_DEALER.slug,
    logo: DEMO_PUBLIC_DEALER.logo,
    phone: DEMO_PUBLIC_DEALER.phone,
    whatsapp: DEMO_PUBLIC_DEALER.whatsapp,
    email: DEMO_PUBLIC_DEALER.email,
    address: DEMO_PUBLIC_DEALER.address,
    city: DEMO_PUBLIC_DEALER.city,
    district: DEMO_PUBLIC_DEALER.district,
    workingHours: `${DEMO_PUBLIC_DEALER.workingHours.weekdays}, Cumartesi ${DEMO_PUBLIC_DEALER.workingHours.saturday}, Pazar ${DEMO_PUBLIC_DEALER.workingHours.sunday}`,
  },
  status: {
    hasDamage: null,
    serviceHistory: null,
    warranty: null,
    previousOwners: null,
  },
}

export function isDemoShowroomSlug(value: string) {
  return value.trim().toLowerCase() === DEMO_SHOWROOM_SLUG
}

export function isDemoVehicleRouteId(value: string) {
  const normalizedValue = value.trim().toLowerCase()
  return normalizedValue === DEMO_VEHICLE_ROUTE_ID || DEMO_LEGACY_VEHICLE_ROUTE_IDS.includes(normalizedValue)
}

export function getDemoVehicleHref(source: 'qr' | 'showroom' | 'direct' = 'showroom') {
  const params = new URLSearchParams({
    src: source,
    ref: DEMO_SHOWROOM_SLUG,
  })

  return `/arac/${DEMO_VEHICLE_ROUTE_ID}?${params.toString()}`
}

export function getDemoShowroomHref() {
  return `/showroom/${DEMO_SHOWROOM_SLUG}`
}

export function getDemoQrTargetUrl() {
  return absoluteUrl(getDemoVehicleHref('qr'))
}

export function getDemoQrImageSrc(size = 220) {
  return `/api/demo/qr-image?url=${encodeURIComponent(getDemoQrTargetUrl())}&size=${size}`
}
