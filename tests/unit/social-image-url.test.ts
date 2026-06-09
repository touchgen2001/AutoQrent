import { describe, expect, it } from 'vitest'

import {
  buildBrandOgUrl,
  buildVehicleCaption,
  buildVehicleOgUrl,
  pickThemeFromColor,
  suggestVehicleBadge,
} from '../../lib/social-image-url'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-06-08T12:00:00.000Z')

function paramsOf(url: string) {
  const queryIndex = url.indexOf('?')
  expect(queryIndex).toBeGreaterThan(-1)
  return new URLSearchParams(url.slice(queryIndex + 1))
}

describe('suggestVehicleBadge', () => {
  it('returns "fiyat-dustu" for a price drop within the last 30 days', () => {
    const priceDroppedAt = new Date(NOW - 5 * DAY).toISOString()
    expect(suggestVehicleBadge({ priceDroppedAt }, NOW)).toBe('fiyat-dustu')
  })

  it('prefers a recent price drop over newness', () => {
    const recent = new Date(NOW - 2 * DAY).toISOString()
    expect(suggestVehicleBadge({ createdAt: recent, priceDroppedAt: recent }, NOW)).toBe('fiyat-dustu')
  })

  it('returns "yeni" for a vehicle added within the last 14 days (no price drop)', () => {
    const createdAt = new Date(NOW - 3 * DAY).toISOString()
    expect(suggestVehicleBadge({ createdAt }, NOW)).toBe('yeni')
  })

  it('returns "" when nothing is recent enough', () => {
    expect(
      suggestVehicleBadge(
        {
          createdAt: new Date(NOW - 40 * DAY).toISOString(),
          priceDroppedAt: new Date(NOW - 40 * DAY).toISOString(),
        },
        NOW,
      ),
    ).toBe('')
  })

  it('ignores future timestamps and unparseable dates', () => {
    expect(suggestVehicleBadge({ createdAt: new Date(NOW + 2 * DAY).toISOString() }, NOW)).toBe('')
    expect(suggestVehicleBadge({ priceDroppedAt: 'not-a-date' }, NOW)).toBe('')
    expect(suggestVehicleBadge({}, NOW)).toBe('')
  })

  it('treats the 30-day / 14-day edges as inclusive', () => {
    expect(suggestVehicleBadge({ priceDroppedAt: new Date(NOW - 30 * DAY).toISOString() }, NOW)).toBe('fiyat-dustu')
    expect(suggestVehicleBadge({ createdAt: new Date(NOW - 14 * DAY).toISOString() }, NOW)).toBe('yeni')
  })

  it('returns "satildi" for a sold vehicle', () => {
    expect(suggestVehicleBadge({ status: 'sold' }, NOW)).toBe('satildi')
  })

  it('returns "rezerve" for a reserved vehicle', () => {
    expect(suggestVehicleBadge({ status: 'reserved' }, NOW)).toBe('rezerve')
  })

  it('prefers status over a recent price drop or newness', () => {
    const recent = new Date(NOW - 1 * DAY).toISOString()
    expect(
      suggestVehicleBadge({ status: 'sold', createdAt: recent, priceDroppedAt: recent }, NOW),
    ).toBe('satildi')
    expect(
      suggestVehicleBadge({ status: 'reserved', createdAt: recent, priceDroppedAt: recent }, NOW),
    ).toBe('rezerve')
  })

  it('ignores an "active" status and falls back to recency rules', () => {
    const recent = new Date(NOW - 2 * DAY).toISOString()
    expect(suggestVehicleBadge({ status: 'active', createdAt: recent }, NOW)).toBe('yeni')
    expect(suggestVehicleBadge({ status: 'active' }, NOW)).toBe('')
  })
})

describe('buildVehicleCaption', () => {
  it('starts with the title and price, then the meta line', () => {
    const caption = buildVehicleCaption({
      title: '2021 BMW 320i',
      priceText: '1.250.000 TL',
      meta: '45.000 km · Benzin · Otomatik',
    })
    const lines = caption.split('\n')
    expect(lines[0]).toBe('2021 BMW 320i')
    expect(lines[1]).toBe('1.250.000 TL')
    expect(lines[2]).toBe('45.000 km · Benzin · Otomatik')
  })

  it('names the gallery in the call-to-action when provided', () => {
    const caption = buildVehicleCaption({
      title: 't',
      priceText: 'p',
      galleryName: 'Demo Galeri',
    })
    expect(caption).toContain('Demo Galeri vitrininde.')
  })

  it('falls back to a generic call-to-action without a gallery name', () => {
    const caption = buildVehicleCaption({ title: 't', priceText: 'p' })
    expect(caption).toContain('Vitrinimizde.')
  })

  it('includes the public URL when given', () => {
    const caption = buildVehicleCaption({
      title: 't',
      priceText: 'p',
      publicUrl: 'https://demo.cebindegaleri.com/arac/abc',
    })
    expect(caption).toContain('https://demo.cebindegaleri.com/arac/abc')
  })

  it('builds hashtags from the brand and model alongside the defaults', () => {
    const caption = buildVehicleCaption({
      title: 't',
      priceText: 'p',
      brand: 'BMW',
      model: '320i',
    })
    const lastLine = caption.split('\n').at(-1)
    expect(lastLine).toBe('#ikinciel #otomobil #BMW #320i')
  })

  it('strips spaces and punctuation out of multi-word brand/model hashtags', () => {
    const caption = buildVehicleCaption({
      title: 't',
      priceText: 'p',
      brand: 'Mercedes-Benz',
      model: 'C 200 d',
    })
    const lastLine = caption.split('\n').at(-1)
    expect(lastLine).toBe('#ikinciel #otomobil #MercedesBenz #C200d')
  })

  it('keeps only the default hashtags when brand and model are empty', () => {
    const caption = buildVehicleCaption({ title: 't', priceText: 'p', brand: '', model: '' })
    const lastLine = caption.split('\n').at(-1)
    expect(lastLine).toBe('#ikinciel #otomobil')
  })
})

describe('buildVehicleOgUrl', () => {
  it('builds a minimal URL with format, title and price', () => {
    const url = buildVehicleOgUrl({ format: 'square', title: '2021 BMW 320i', priceText: '1.250.000 TL' })
    expect(url.startsWith('/og/vehicle?')).toBe(true)
    const params = paramsOf(url)
    expect(params.get('format')).toBe('square')
    expect(params.get('title')).toBe('2021 BMW 320i')
    expect(params.get('price')).toBe('1.250.000 TL')
    expect(params.has('theme')).toBe(false)
  })

  it('omits the theme param for the default "koyu" theme but sets it otherwise', () => {
    const koyu = paramsOf(buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', theme: 'koyu' }))
    expect(koyu.has('theme')).toBe(false)
    const acik = paramsOf(buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', theme: 'acik' }))
    expect(acik.get('theme')).toBe('acik')
  })

  it('derives the tag from the showroom URL host', () => {
    const params = paramsOf(
      buildVehicleOgUrl({
        format: 'story',
        title: 't',
        priceText: 'p',
        showroomUrl: 'https://demo.cebindegaleri.com/showroom/abc?x=1',
      }),
    )
    expect(params.get('tag')).toBe('demo.cebindegaleri.com')
  })

  it('ignores an unparseable showroom URL', () => {
    const params = paramsOf(
      buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', showroomUrl: 'not a url' }),
    )
    expect(params.has('tag')).toBe(false)
  })

  it('prefers logo over monogram', () => {
    const params = paramsOf(
      buildVehicleOgUrl({
        format: 'square',
        title: 't',
        priceText: 'p',
        logo: 'https://cdn.example.com/logo.png',
        monogram: 'AB',
      }),
    )
    expect(params.get('logo')).toBe('https://cdn.example.com/logo.png')
    expect(params.has('monogram')).toBe(false)
  })

  it('falls back to the monogram when there is no logo', () => {
    const params = paramsOf(
      buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', monogram: 'AB' }),
    )
    expect(params.get('monogram')).toBe('AB')
  })

  it('only sets the QR pair when both qr and qrN are present', () => {
    const both = paramsOf(
      buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', qr: 'AAAA', qrN: 21 }),
    )
    expect(both.get('qr')).toBe('AAAA')
    expect(both.get('qrN')).toBe('21')

    const onlyQr = paramsOf(buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', qr: 'AAAA' }))
    expect(onlyQr.has('qr')).toBe(false)
    expect(onlyQr.has('qrN')).toBe(false)
  })

  it('passes through phone, badge, meta and photo', () => {
    const params = paramsOf(
      buildVehicleOgUrl({
        format: 'story',
        title: 't',
        priceText: 'p',
        meta: '45.000 km · Benzin · Otomatik',
        photo: 'https://cdn.example.com/car.jpg',
        badge: 'fiyat-dustu',
        phoneDisplay: '0555 123 45 67',
      }),
    )
    expect(params.get('meta')).toBe('45.000 km · Benzin · Otomatik')
    expect(params.get('photo')).toBe('https://cdn.example.com/car.jpg')
    expect(params.get('badge')).toBe('fiyat-dustu')
    expect(params.get('phone')).toBe('0555 123 45 67')
  })

  it('sets the price-drop strip text when provided and omits it otherwise', () => {
    const withDrop = paramsOf(
      buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p', drop: '30.000 TL' }),
    )
    expect(withDrop.get('drop')).toBe('30.000 TL')
    const without = paramsOf(buildVehicleOgUrl({ format: 'square', title: 't', priceText: 'p' }))
    expect(without.has('drop')).toBe(false)
  })
})

describe('pickThemeFromColor', () => {
  it('keeps near-grayscale logos on the default "koyu" theme', () => {
    expect(pickThemeFromColor({ r: 0, g: 0, b: 0 })).toBe('koyu')
    expect(pickThemeFromColor({ r: 255, g: 255, b: 255 })).toBe('koyu')
    expect(pickThemeFromColor({ r: 128, g: 130, b: 127 })).toBe('koyu')
  })

  it('maps strong reds and warm tones to "bordo"', () => {
    expect(pickThemeFromColor({ r: 200, g: 20, b: 20 })).toBe('bordo')
    expect(pickThemeFromColor({ r: 210, g: 90, b: 40 })).toBe('bordo')
  })

  it('maps blues to "lacivert"', () => {
    expect(pickThemeFromColor({ r: 30, g: 60, b: 200 })).toBe('lacivert')
    expect(pickThemeFromColor({ r: 20, g: 30, b: 160 })).toBe('lacivert')
  })

  it('falls back to "koyu" for greens (no dedicated theme)', () => {
    expect(pickThemeFromColor({ r: 40, g: 180, b: 60 })).toBe('koyu')
  })

  it('treats the chroma threshold as a cutoff (just-saturated vs near-gray)', () => {
    // chroma 30 (< 40) → koyu; chroma 60 red → bordo
    expect(pickThemeFromColor({ r: 130, g: 100, b: 100 })).toBe('koyu')
    expect(pickThemeFromColor({ r: 160, g: 100, b: 100 })).toBe('bordo')
  })

  it('clamps invalid channel values instead of throwing', () => {
    expect(pickThemeFromColor({ r: Number.NaN, g: 0, b: 0 })).toBe('koyu')
    expect(pickThemeFromColor({ r: 999, g: -50, b: -50 })).toBe('bordo')
  })
})

describe('buildBrandOgUrl', () => {
  it('builds a minimal profile URL', () => {
    const url = buildBrandOgUrl(null, 'profile')
    expect(url.startsWith('/og/brand?')).toBe(true)
    const params = paramsOf(url)
    expect(params.get('format')).toBe('profile')
    expect(params.has('gallery')).toBe(false)
  })

  it('passes through name, city, tagline and a positive count', () => {
    const params = paramsOf(
      buildBrandOgUrl(
        { name: 'Demo Galeri', city: 'İzmir', heroTagline: 'Güvenle alın', vehicleCount: 12 },
        'cover',
      ),
    )
    expect(params.get('format')).toBe('cover')
    expect(params.get('gallery')).toBe('Demo Galeri')
    expect(params.get('city')).toBe('İzmir')
    expect(params.get('tagline')).toBe('Güvenle alın')
    expect(params.get('count')).toBe('12')
  })

  it('omits a zero or negative vehicle count', () => {
    expect(paramsOf(buildBrandOgUrl({ vehicleCount: 0 }, 'profile')).has('count')).toBe(false)
    expect(paramsOf(buildBrandOgUrl({ vehicleCount: -3 }, 'profile')).has('count')).toBe(false)
  })

  it('omits the theme param for the default "koyu" but sets it otherwise', () => {
    expect(paramsOf(buildBrandOgUrl(null, 'profile', 'koyu')).has('theme')).toBe(false)
    expect(paramsOf(buildBrandOgUrl(null, 'profile')).has('theme')).toBe(false)
    expect(paramsOf(buildBrandOgUrl(null, 'cover', 'lacivert')).get('theme')).toBe('lacivert')
    expect(paramsOf(buildBrandOgUrl(null, 'cover', 'bordo')).get('theme')).toBe('bordo')
  })

  it('derives the tag from the showroom URL host and ignores an unparseable one', () => {
    expect(
      paramsOf(buildBrandOgUrl({ showroomUrl: 'https://demo.cebindegaleri.com/showroom/x' }, 'profile')).get('tag'),
    ).toBe('demo.cebindegaleri.com')
    expect(paramsOf(buildBrandOgUrl({ showroomUrl: 'not a url' }, 'profile')).has('tag')).toBe(false)
  })

  it('prefers logo over monogram but falls back to the monogram', () => {
    const withLogo = paramsOf(
      buildBrandOgUrl({ logo: 'https://cdn.example.com/logo.png', monogram: 'AB' }, 'profile'),
    )
    expect(withLogo.get('logo')).toBe('https://cdn.example.com/logo.png')
    expect(withLogo.has('monogram')).toBe(false)
    expect(paramsOf(buildBrandOgUrl({ monogram: 'AB' }, 'profile')).get('monogram')).toBe('AB')
  })
})
