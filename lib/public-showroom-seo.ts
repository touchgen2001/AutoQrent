import { absoluteUrl, siteConfig } from '@/lib/seo'
import type { PublicDealer, PublicVehicle } from '@/lib/public-catalog-types'

function optionalText(value: string | null | undefined) {
  const trimmed = value?.trim() || ''
  return trimmed || undefined
}

function absoluteMaybeUrl(value: string | null | undefined) {
  const trimmed = optionalText(value)
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return absoluteUrl(trimmed)
}

function normalizeExternalUrl(value: string | null | undefined) {
  const trimmed = optionalText(value)
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeSocialHandle(value: string | undefined) {
  return value?.trim().replace(/^@+/, '') || ''
}

function socialUrl(platform: 'instagram' | 'facebook' | 'youtube' | 'twitter', value: string | undefined) {
  const normalized = normalizeSocialHandle(value)
  if (!normalized) return undefined
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (platform === 'instagram') return `https://instagram.com/${normalized}`
  if (platform === 'facebook') return `https://facebook.com/${normalized}`
  if (platform === 'youtube') return `https://youtube.com/@${normalized}`
  return `https://x.com/${normalized}`
}

function dealerLocationText(dealer: PublicDealer) {
  return [dealer.district, dealer.city].filter(Boolean).join(', ')
}

function vehicleImageUrl(vehicle: PublicVehicle) {
  return absoluteMaybeUrl(vehicle.images[0])
}

function vehicleUrl(vehicle: PublicVehicle) {
  return absoluteUrl(`/arac/${vehicle.routeId}`)
}

function showroomUrl(dealer: PublicDealer) {
  return absoluteUrl(`/showroom/${dealer.slug}`)
}

function uniqueBrands(vehicles: PublicVehicle[]) {
  return [...new Set(vehicles.map((vehicle) => vehicle.brand).filter(Boolean))].slice(0, 12)
}

function publicVehicleName(vehicle: PublicVehicle) {
  return vehicle.title || `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.trim()
}

function buildPostalAddress(dealer: PublicDealer) {
  return {
    '@type': 'PostalAddress',
    streetAddress: optionalText(dealer.address),
    addressLocality: dealerLocationText(dealer) || undefined,
    addressCountry: 'TR',
  }
}

export function getShowroomSeoTitle(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  const vehicleCount = vehicles.length
  if (vehicleCount > 0) {
    return `${dealer.name} Araç Vitrini | ${vehicleCount} Yayındaki Araç`
  }
  return `${dealer.name} Araç Vitrini`
}

export function getShowroomSeoDescription(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  const location = dealerLocationText(dealer)
  const locationCopy = location ? `${location} lokasyonundaki ` : ''
  const vehicleCopy =
    vehicles.length > 0
      ? `${vehicles.length} yayındaki araç, fiyat, kilometre, görsel ve iletişim bilgisi`
      : 'yayındaki araç listesi ve iletişim bilgileri'

  return `${locationCopy}${dealer.name} public showroom sayfası: ${vehicleCopy} galeri panelindeki gerçek kayıtlardan gösterilir.`
}

export function getShowroomSeoImage(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  return absoluteMaybeUrl(dealer.logo) || vehicles.map(vehicleImageUrl).find(Boolean)
}

export function getShowroomSeoKeywords(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  return [
    dealer.name.toLowerCase(),
    'public galeri showroom',
    'galeri araç vitrini',
    'ikinci el araç listesi',
    ...uniqueBrands(vehicles).map((brand) => `${brand.toLowerCase()} galeri aracı`),
  ]
}

export function buildShowroomAutoDealerJsonLd(dealer: PublicDealer) {
  const sameAs = [
    normalizeExternalUrl(dealer.websiteUrl),
    socialUrl('instagram', dealer.socialMedia.instagram),
    socialUrl('facebook', dealer.socialMedia.facebook),
    socialUrl('youtube', dealer.socialMedia.youtube),
    socialUrl('twitter', dealer.socialMedia.twitter),
  ].filter(Boolean)

  return {
    '@context': 'https://schema.org',
    '@type': 'AutoDealer',
    '@id': `${showroomUrl(dealer)}#dealer`,
    name: dealer.name,
    url: showroomUrl(dealer),
    image: absoluteMaybeUrl(dealer.logo),
    logo: absoluteMaybeUrl(dealer.logo),
    telephone: optionalText(dealer.phone),
    email: optionalText(dealer.email),
    address: buildPostalAddress(dealer),
    openingHours: [
      dealer.workingHours.weekdays,
      dealer.workingHours.saturday,
      dealer.workingHours.sunday,
    ].filter((value) => value && value !== 'Galeri ile iletişime geçin'),
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

export function buildShowroomWebPageJsonLd(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${showroomUrl(dealer)}#webpage`,
    url: showroomUrl(dealer),
    name: getShowroomSeoTitle(dealer, vehicles),
    description: getShowroomSeoDescription(dealer, vehicles),
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name,
      url: siteConfig.siteUrl,
    },
    about: {
      '@id': `${showroomUrl(dealer)}#dealer`,
    },
  }
}

export function buildShowroomVehicleItemListJsonLd(dealer: PublicDealer, vehicles: PublicVehicle[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': `${showroomUrl(dealer)}#vehicles`,
    name: `${dealer.name} yayındaki araçlar`,
    numberOfItems: vehicles.length,
    itemListElement: vehicles.slice(0, 50).map((vehicle, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: vehicleUrl(vehicle),
      item: {
        '@type': 'Car',
        name: publicVehicleName(vehicle),
        url: vehicleUrl(vehicle),
        image: vehicleImageUrl(vehicle),
        brand: {
          '@type': 'Brand',
          name: vehicle.brand,
        },
        model: vehicle.model,
        vehicleModelDate: `${vehicle.year}-01-01`,
        mileageFromOdometer: {
          '@type': 'QuantitativeValue',
          value: vehicle.mileage,
          unitCode: 'KMT',
        },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'TRY',
          price: vehicle.price,
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
          seller: {
            '@id': `${showroomUrl(dealer)}#dealer`,
          },
        },
      },
    })),
  }
}

export function buildShowroomBreadcrumbJsonLd(dealer: PublicDealer) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Cebindegaleri',
        item: absoluteUrl('/'),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: dealer.name,
        item: showroomUrl(dealer),
      },
    ],
  }
}
