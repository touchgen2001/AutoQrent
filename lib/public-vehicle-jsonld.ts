import { galleryInitials } from '@/lib/gallery-monogram'
import { absoluteUrl } from '@/lib/seo'
import type { PublicVehicleDetail } from '@/lib/public-catalog-types'

export type VehicleFaqItem = {
  question: string
  answer: string
}

function isAbsoluteHttpUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export function vehicleImageUrl(value: string) {
  return isAbsoluteHttpUrl(value) ? value : absoluteUrl(value)
}

function buildPostalAddress(input: {
  address: string
  city?: string
  district?: string
}) {
  return {
    '@type': 'PostalAddress',
    streetAddress: input.address || undefined,
    addressLocality: [input.district, input.city].filter(Boolean).join(', ') || undefined,
    addressCountry: 'TR',
  }
}

export function getVehicleSeoTitle(vehicle: PublicVehicleDetail) {
  return `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant} Fiyatı ve Detayları`
}

export function getVehicleSeoDescription(vehicle: PublicVehicleDetail) {
  const location = [vehicle.gallery.district, vehicle.gallery.city].filter(Boolean).join(', ')
  const locationCopy = location ? ` ${location} lokasyonundaki ${vehicle.gallery.name} üzerinden` : ` ${vehicle.gallery.name} üzerinden`
  return `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant}; ${vehicle.mileage.toLocaleString('tr-TR')} km, ${vehicle.fuel}, ${vehicle.transmission}.${locationCopy} güncel fiyat, teknik özellik ve iletişim bilgileri.`
}

function buildVehicleOgCardImage(vehicle: PublicVehicleDetail) {
  const carTitle = `${vehicle.year} ${vehicle.brand} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`.trim()
  const priceText = vehicle.price > 0 ? `${vehicle.price.toLocaleString('tr-TR')} TL` : 'Fiyat için arayın'
  const search = new URLSearchParams({
    eyebrow: vehicle.gallery.name || 'Oto Galeri',
    title: carTitle,
    subtitle: `${priceText} · ${vehicle.mileage.toLocaleString('tr-TR')} km`,
  })
  if (vehicle.gallery.logo) {
    search.set('logo', vehicleImageUrl(vehicle.gallery.logo))
  } else {
    const monogram = galleryInitials(vehicle.gallery.name)
    if (monogram) search.set('monogram', monogram)
  }
  return absoluteUrl(`/og?${search.toString()}`)
}

export function getVehicleSeoImage(vehicle: PublicVehicleDetail) {
  // Prefer the real car photo (best link preview); when a listing has no photo,
  // emit a branded card carrying the car + price instead of a bare gallery logo.
  return vehicle.images[0] ? vehicleImageUrl(vehicle.images[0]) : buildVehicleOgCardImage(vehicle)
}

export function buildVehicleFaqItems(vehicle: PublicVehicleDetail): VehicleFaqItem[] {
  const damageText =
    vehicle.status.hasDamage === null
      ? 'Hasar bilgisi sistemde belirtilmemis. Detayli ekspertiz dokumani talep edebilirsiniz.'
      : vehicle.status.hasDamage
        ? 'Araçta kayıtlı hasar bilgisi bulunuyor. Detaylı ekspertiz raporu galeri tarafından paylaşılır.'
        : 'Araçta beyan edilen aktif hasar kaydı yoktur. Detaylı ekspertiz bilgisi talep edildiğinde paylaşılır.'

  return [
    {
      question: `${vehicle.brand} ${vehicle.model} ${vehicle.variant} ekspertiz durumu nedir?`,
      answer: damageText,
    },
    {
      question: 'Test sürüşü ve yerinde inceleme yapılabiliyor mu?',
      answer: `${vehicle.gallery.name} çalışma saatlerinde (${vehicle.gallery.workingHours}) test sürüşü ve araç inceleme randevusu oluşturulabilir.`,
    },
    {
      question: 'Fiyat ve ödeme seçenekleri nasıl paylaşılır?',
      answer: `Güncel fiyat ${vehicle.price.toLocaleString('tr-TR')} TL olup kredi, takas ve ödeme seçenekleri için doğrudan ${vehicle.gallery.phone || 'galeri telefonu'} üzerinden iletişime geçebilirsiniz.`,
    },
  ]
}

export function buildVehicleJsonLd(vehicle: PublicVehicleDetail) {
  const vehicleUrl = absoluteUrl(`/arac/${vehicle.routeId}`)

  const knownDamages =
    vehicle.status.hasDamage === null
      ? 'Hasar bilgisi belirtilmedi.'
      : vehicle.status.hasDamage
        ? 'Kayıtlı hasar bilgisi mevcut, detay için galeri ile iletişime geçin.'
        : 'Bilinen aktif hasar kaydı yok.'

  return {
    '@context': 'https://schema.org',
    '@type': 'Car',
    name: `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant}`,
    model: vehicle.model,
    brand: {
      '@type': 'Brand',
      name: vehicle.brand,
    },
    vehicleModelDate: `${vehicle.year}-01-01`,
    bodyType: vehicle.bodyType,
    color: vehicle.color,
    fuelType: vehicle.fuel,
    vehicleTransmission: vehicle.transmission,
    mileageFromOdometer: {
      '@type': 'QuantitativeValue',
      value: vehicle.mileage,
      unitCode: 'KMT',
    },
    numberOfPreviousOwners: vehicle.status.previousOwners ?? undefined,
    knownVehicleDamages: knownDamages,
    description: vehicle.description,
    image: vehicle.images.map((image) => vehicleImageUrl(image)),
    url: vehicleUrl,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'TRY',
      price: vehicle.price,
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/UsedCondition',
      url: vehicleUrl,
      seller: {
        '@type': 'AutoDealer',
        name: vehicle.gallery.name,
        url: vehicle.gallery.slug ? absoluteUrl(`/showroom/${vehicle.gallery.slug}`) : undefined,
        image: vehicle.gallery.logo || undefined,
        telephone: vehicle.gallery.phone,
        email: vehicle.gallery.email || undefined,
        address: buildPostalAddress({
          address: vehicle.gallery.address,
          city: vehicle.gallery.city,
          district: vehicle.gallery.district,
        }),
      },
    },
  }
}

export function buildVehicleBreadcrumbJsonLd(vehicle: PublicVehicleDetail) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Cebindegaleri',
      item: absoluteUrl('/'),
    },
  ]

  if (vehicle.gallery.slug) {
    items.push({
      '@type': 'ListItem',
      position: 2,
      name: vehicle.gallery.name,
      item: absoluteUrl(`/showroom/${vehicle.gallery.slug}`),
    })
  }

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: `${vehicle.year} ${vehicle.brand} ${vehicle.model} ${vehicle.variant}`.trim(),
    item: absoluteUrl(`/arac/${vehicle.routeId}`),
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  }
}

export function buildVehicleFaqJsonLd(vehicle: PublicVehicleDetail) {
  const items = buildVehicleFaqItems(vehicle)
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}
