import { NextResponse } from 'next/server'
import { z } from 'zod'

import { absoluteUrl } from '@/lib/seo'
import { ensureSecurePublicSlug, hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import {
  containsPlaceholderText,
  hasPlaceholderEmailDomain,
  hasPlaceholderHostname,
} from '@/lib/server/panel-input-guard'
import {
  DEFAULT_PUBLIC_SHOWROOM_THEME,
  PUBLIC_SHOWROOM_BACKGROUND_VALUES,
  PUBLIC_SHOWROOM_THEME_VALUES,
  normalizePublicShowroomTheme,
} from '@/lib/public-showroom-theme'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

type GalleryRow = {
  id: string
  name: string
  slug: string
  phone: string | null
  email: string | null
  logo_url: string | null
  address: string | null
  city: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  google_maps_url: string | null
  weekday_hours: string | null
  saturday_hours: string | null
  sunday_hours: string | null
  website_url: string | null
  instagram_handle: string | null
  facebook_page: string | null
  youtube_channel: string | null
  twitter_handle: string | null
  public_theme?: string | null
  public_accent_color?: string | null
  public_background_style?: string | null
  public_hero_tagline?: string | null
  public_showroom_note?: string | null
}

type VehicleCountRow = {
  id: string
  status: string
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/).optional(),
  phone: z.string().trim().max(40).optional(),
  whatsapp: z.string().trim().max(40).optional(),
  email: z.string().trim().email().max(160).or(z.literal('')).optional(),
  logoUrl: z.string().trim().url().max(2048).or(z.literal('')).optional(),
  address: z.string().trim().max(240).or(z.literal('')).optional(),
  city: z.string().trim().max(80).or(z.literal('')).optional(),
  district: z.string().trim().max(80).or(z.literal('')).optional(),
  latitude: z.union([z.number(), z.string().trim(), z.null()]).optional(),
  longitude: z.union([z.number(), z.string().trim(), z.null()]).optional(),
  googleMapsUrl: z.string().trim().url().max(2048).or(z.literal('')).optional(),
  workingHours: z.object({
    weekdays: z.string().trim().max(60),
    saturday: z.string().trim().max(60),
    sunday: z.string().trim().max(60),
  }).optional(),
  websiteUrl: z.string().trim().url().max(2048).or(z.literal('')).optional(),
  socialMedia: z.object({
    instagram: z.string().trim().max(120).optional(),
    facebook: z.string().trim().max(120).optional(),
    youtube: z.string().trim().max(120).optional(),
    twitter: z.string().trim().max(120).optional(),
  }).optional(),
  publicTheme: z.object({
    theme: z.enum(PUBLIC_SHOWROOM_THEME_VALUES),
    accentColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'Tema rengi geçerli hex formatında olmalıdır.'),
    backgroundStyle: z.enum(PUBLIC_SHOWROOM_BACKGROUND_VALUES),
    heroTagline: z.string().trim().max(80, 'Slogan en fazla 80 karakter olabilir.').or(z.literal('')),
    heroNote: z.string().trim().max(220, 'Public açıklama en fazla 220 karakter olabilir.').or(z.literal('')),
  }).optional(),
}).strict()

const BASE_GALLERY_SELECT = [
  'id',
  'name',
  'slug',
  'phone',
  'email',
  'logo_url',
  'address',
  'city',
  'district',
  'latitude',
  'longitude',
  'google_maps_url',
  'weekday_hours',
  'saturday_hours',
  'sunday_hours',
  'website_url',
  'instagram_handle',
  'facebook_page',
  'youtube_channel',
  'twitter_handle',
].join(',')

const THEME_GALLERY_SELECT = [
  BASE_GALLERY_SELECT,
  'public_theme',
  'public_accent_color',
  'public_background_style',
  'public_hero_tagline',
  'public_showroom_note',
].join(',')

type CoordinateInput = number | string | null

const PHONE_ALLOWED_CHARACTERS = /^[0-9+\s()-]+$/

function parseNullableCoordinate(value: CoordinateInput) {
  if (value === null) return null
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const normalized = value.replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function isLatitudeValid(value: number) {
  return value >= -90 && value <= 90
}

function isLongitudeValid(value: number) {
  return value >= -180 && value <= 180
}

function buildGoogleMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`
}

function normalizeSocialHandle(value: string | undefined) {
  const trimmed = value?.trim() || ''
  if (!trimmed) return null
  return trimmed.replace(/^@+/, '')
}

function normalizePhoneForStorage(value: string | undefined) {
  const raw = value?.trim() || ''
  if (!raw) return null

  if (!PHONE_ALLOWED_CHARACTERS.test(raw)) {
    return { normalized: null, error: 'Telefon alanında yalnızca sayı ve standart telefon karakterleri kullanılabilir.' }
  }

  if (containsPlaceholderText(raw)) {
    return { normalized: null, error: 'Telefon alanına örnek/sahte değer girilemez.' }
  }

  const digits = raw.replace(/\D/g, '')
  if (!digits) return { normalized: null, error: 'Telefon numarası geçersiz.' }

  let normalized = digits
  if (digits.length === 10) {
    normalized = `0${digits}`
  } else if (digits.length === 11 && digits.startsWith('0')) {
    normalized = digits
  } else if (digits.length === 12 && digits.startsWith('90')) {
    normalized = `0${digits.slice(2)}`
  } else {
    return { normalized: null, error: 'Telefon numarası 10-12 haneli geçerli bir formatta olmalıdır.' }
  }

  if (!/^0\d{10}$/.test(normalized)) {
    return { normalized: null, error: 'Telefon numarası biçimi geçersiz.' }
  }

  if (/(.)\1{6,}/.test(normalized.slice(1))) {
    return { normalized: null, error: 'Telefon numarası geçersiz görünüyor.' }
  }

  return { normalized, error: null }
}

function pickPrimaryPhone(phoneInput: string | null | undefined, whatsappInput: string | null | undefined) {
  const phone = phoneInput || ''
  const whatsapp = whatsappInput || ''
  if (phone) return phone
  if (whatsapp) return whatsapp
  return null
}

function normalizePhoneNumber(rawPhone: string | null | undefined) {
  if (!rawPhone) return ''
  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function sanitizePlainField(value: string | null | undefined) {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (containsPlaceholderText(trimmed)) return ''
  return trimmed
}

function sanitizeUrlField(value: string | null | undefined) {
  const trimmed = sanitizePlainField(value)
  if (!trimmed) return ''
  if (hasPlaceholderHostname(trimmed)) return ''
  return trimmed
}

function sanitizeEmailField(value: string | null | undefined) {
  const trimmed = sanitizePlainField(value)
  if (!trimmed) return ''
  if (hasPlaceholderEmailDomain(trimmed)) return ''
  return trimmed
}

async function fetchGallerySettingsRows(ownerEmail: string) {
  try {
    const galleries = await supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: THEME_GALLERY_SELECT,
        owner_email: `eq.${ownerEmail}`,
        limit: 1,
      },
    })

    return {
      galleries,
      themeStorageReady: true,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (
      !message.includes('public_theme')
      && !message.includes('public_accent_color')
      && !message.includes('public_background_style')
      && !message.includes('public_hero_tagline')
      && !message.includes('public_showroom_note')
    ) {
      throw error
    }

    const galleries = await supabaseAdminFetch<GalleryRow[]>({
      path: '/rest/v1/galleries',
      query: {
        select: BASE_GALLERY_SELECT,
        owner_email: `eq.${ownerEmail}`,
        limit: 1,
      },
    })

    return {
      galleries,
      themeStorageReady: false,
    }
  }
}

async function fetchSettingsPayload(ownerEmail: string) {
  const { galleries, themeStorageReady } = await fetchGallerySettingsRows(ownerEmail)

  const gallery = galleries[0] || null
  if (!gallery) return null

  let safeSlug = gallery.slug?.trim().toLowerCase() || ''
  if (!hasSecurePublicRouteToken(safeSlug)) {
    safeSlug = ensureSecurePublicSlug(gallery.name || safeSlug || 'galeri', 'galeri')
    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/galleries',
      query: {
        id: `eq.${gallery.id}`,
      },
      body: {
        slug: safeSlug,
      },
      prefer: 'return=minimal',
    })
  }

  const safePhone = sanitizePlainField(gallery.phone)
  const safeEmail = sanitizeEmailField(gallery.email)
  const safeLogoUrl = sanitizeUrlField(gallery.logo_url)
  const safeAddress = sanitizePlainField(gallery.address)
  const safeCity = sanitizePlainField(gallery.city)
  const safeDistrict = sanitizePlainField(gallery.district)
  const safeMapsUrl = sanitizeUrlField(gallery.google_maps_url)
  const safeWeekdayHours = sanitizePlainField(gallery.weekday_hours)
  const safeSaturdayHours = sanitizePlainField(gallery.saturday_hours)
  const safeSundayHours = sanitizePlainField(gallery.sunday_hours)
  const safeWebsiteUrl = sanitizeUrlField(gallery.website_url)
  const safeInstagram = sanitizePlainField(gallery.instagram_handle)
  const safeFacebook = sanitizePlainField(gallery.facebook_page)
  const safeYoutube = sanitizePlainField(gallery.youtube_channel)
  const safeTwitter = sanitizePlainField(gallery.twitter_handle)
  const publicTheme = normalizePublicShowroomTheme({
    theme: gallery.public_theme || DEFAULT_PUBLIC_SHOWROOM_THEME.theme,
    accentColor: gallery.public_accent_color || DEFAULT_PUBLIC_SHOWROOM_THEME.accentColor,
    backgroundStyle: gallery.public_background_style || DEFAULT_PUBLIC_SHOWROOM_THEME.backgroundStyle,
    heroTagline: sanitizePlainField(gallery.public_hero_tagline),
    heroNote: sanitizePlainField(gallery.public_showroom_note),
  })

  const vehicles = await supabaseAdminFetch<VehicleCountRow[]>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,status',
      gallery_id: `eq.${gallery.id}`,
      limit: 10000,
    },
  })

  return {
    galleryId: gallery.id,
    name: gallery.name,
    slug: safeSlug,
    showroomPath: `/showroom/${safeSlug}`,
    publicShowroomUrl: absoluteUrl(`/showroom/${safeSlug}`),
    phone: safePhone,
    whatsapp: normalizePhoneNumber(safePhone),
    email: safeEmail,
    logoUrl: safeLogoUrl,
    address: safeAddress,
    city: safeCity,
    district: safeDistrict,
    latitude: gallery.latitude,
    longitude: gallery.longitude,
    googleMapsUrl: safeMapsUrl
      || (gallery.latitude !== null && gallery.longitude !== null
        ? buildGoogleMapsUrl(gallery.latitude, gallery.longitude)
        : ''),
    workingHours: {
      weekdays: safeWeekdayHours || '09:00 - 19:00',
      saturday: safeSaturdayHours || '09:00 - 17:00',
      sunday: safeSundayHours || 'Kapalı',
    },
    websiteUrl: safeWebsiteUrl,
    socialMedia: {
      instagram: safeInstagram,
      facebook: safeFacebook,
      youtube: safeYoutube,
      twitter: safeTwitter,
    },
    publicTheme,
    publicThemeStorageReady: themeStorageReady,
    vehicleCount: vehicles.length,
    activeVehicleCount: vehicles.filter((vehicle) => vehicle.status === 'active').length,
  }
}

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()

    const payload = await fetchSettingsPayload(session.email)
    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Ayarlar için galeri kaydı bulunamadı.',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      settings: payload,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Ayarlar alınamadı.',
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()

    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz ayar verisi.',
        },
        { status: 400 },
      )
    }

    const payload = await fetchSettingsPayload(session.email)
    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Güncellenecek galeri kaydı bulunamadı.',
        },
        { status: 404 },
      )
    }

    const galleryPatch: Record<string, string | number | null> = {}
    const normalizedPhone = parsed.data.phone !== undefined
      ? normalizePhoneForStorage(parsed.data.phone)
      : null
    const normalizedWhatsapp = parsed.data.whatsapp !== undefined
      ? normalizePhoneForStorage(parsed.data.whatsapp)
      : null

    if (normalizedPhone?.error) {
      return NextResponse.json(
        {
          ok: false,
          message: normalizedPhone.error,
        },
        { status: 400 },
      )
    }

    if (normalizedWhatsapp?.error) {
      return NextResponse.json(
        {
          ok: false,
          message: normalizedWhatsapp.error.replace('Telefon', 'WhatsApp'),
        },
        { status: 400 },
      )
    }

    if (parsed.data.email !== undefined && parsed.data.email && hasPlaceholderEmailDomain(parsed.data.email)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'E-posta alanına örnek domain girilemez. Gerçek bir e-posta kullanın.',
        },
        { status: 400 },
      )
    }

    if (parsed.data.websiteUrl !== undefined && parsed.data.websiteUrl && hasPlaceholderHostname(parsed.data.websiteUrl)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Web sitesi alanında örnek/test domain kullanılamaz.',
        },
        { status: 400 },
      )
    }

    if (parsed.data.googleMapsUrl !== undefined && parsed.data.googleMapsUrl && hasPlaceholderHostname(parsed.data.googleMapsUrl)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Harita linkinde örnek/test domain kullanılamaz.',
        },
        { status: 400 },
      )
    }

    const fakeField = [
      { label: 'Galeri adı', value: parsed.data.name },
      { label: 'Adres', value: parsed.data.address },
      { label: 'İl', value: parsed.data.city },
      { label: 'İlçe', value: parsed.data.district },
      { label: 'Slogan', value: parsed.data.publicTheme?.heroTagline },
      { label: 'Public açıklama', value: parsed.data.publicTheme?.heroNote },
    ].find((item) => item.value && containsPlaceholderText(item.value))

    if (fakeField) {
      return NextResponse.json(
        {
          ok: false,
          message: `${fakeField.label} alanında örnek/sahte değer kullanılamaz.`,
        },
        { status: 400 },
      )
    }

    if (parsed.data.name !== undefined) galleryPatch.name = parsed.data.name
    if (parsed.data.slug !== undefined) galleryPatch.slug = ensureSecurePublicSlug(parsed.data.slug, 'galeri')
    if (parsed.data.email !== undefined) galleryPatch.email = parsed.data.email || null
    if (parsed.data.logoUrl !== undefined) galleryPatch.logo_url = parsed.data.logoUrl || null
    if (parsed.data.address !== undefined) galleryPatch.address = parsed.data.address || null
    if (parsed.data.city !== undefined) galleryPatch.city = parsed.data.city || null
    if (parsed.data.district !== undefined) galleryPatch.district = parsed.data.district || null
    if (parsed.data.googleMapsUrl !== undefined) galleryPatch.google_maps_url = parsed.data.googleMapsUrl || null
    if (parsed.data.workingHours !== undefined) {
      galleryPatch.weekday_hours = parsed.data.workingHours.weekdays || null
      galleryPatch.saturday_hours = parsed.data.workingHours.saturday || null
      galleryPatch.sunday_hours = parsed.data.workingHours.sunday || null
    }
    if (parsed.data.websiteUrl !== undefined) {
      galleryPatch.website_url = parsed.data.websiteUrl || null
    }
    if (parsed.data.socialMedia !== undefined) {
      const instagramHandle = normalizeSocialHandle(parsed.data.socialMedia.instagram)
      const facebookPage = normalizeSocialHandle(parsed.data.socialMedia.facebook)
      const youtubeChannel = normalizeSocialHandle(parsed.data.socialMedia.youtube)
      const twitterHandle = normalizeSocialHandle(parsed.data.socialMedia.twitter)

      const socialValues = [
        { value: instagramHandle, label: 'Instagram' },
        { value: facebookPage, label: 'Facebook' },
        { value: youtubeChannel, label: 'YouTube' },
        { value: twitterHandle, label: 'Twitter/X' },
      ]

      const invalidSocial = socialValues.find((item) => item.value && containsPlaceholderText(item.value))
      if (invalidSocial) {
        return NextResponse.json(
          {
            ok: false,
            message: `${invalidSocial.label} alanına örnek/sahte değer girilemez.`,
          },
          { status: 400 },
        )
      }

      galleryPatch.instagram_handle = instagramHandle
      galleryPatch.facebook_page = facebookPage
      galleryPatch.youtube_channel = youtubeChannel
      galleryPatch.twitter_handle = twitterHandle
    }

    if (parsed.data.publicTheme !== undefined) {
      if (!payload.publicThemeStorageReady) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Public tema kaydı için Supabase migration henüz uygulanmamış.',
          },
          { status: 409 },
        )
      }

      const publicTheme = normalizePublicShowroomTheme(parsed.data.publicTheme)
      galleryPatch.public_theme = publicTheme.theme
      galleryPatch.public_accent_color = publicTheme.accentColor
      galleryPatch.public_background_style = publicTheme.backgroundStyle
      galleryPatch.public_hero_tagline = publicTheme.heroTagline || null
      galleryPatch.public_showroom_note = publicTheme.heroNote || null
    }

    if (parsed.data.phone !== undefined || parsed.data.whatsapp !== undefined) {
      galleryPatch.phone = pickPrimaryPhone(
        normalizedPhone?.normalized,
        normalizedWhatsapp?.normalized,
      )
    }

    if (parsed.data.latitude !== undefined) {
      const latitude = parseNullableCoordinate(parsed.data.latitude)
      if (latitude !== null && !isLatitudeValid(latitude)) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Enlem -90 ile 90 arasında olmalıdır.',
          },
          { status: 400 },
        )
      }
      galleryPatch.latitude = latitude
    }

    if (parsed.data.longitude !== undefined) {
      const longitude = parseNullableCoordinate(parsed.data.longitude)
      if (longitude !== null && !isLongitudeValid(longitude)) {
        return NextResponse.json(
          {
            ok: false,
            message: 'Boylam -180 ile 180 arasında olmalıdır.',
          },
          { status: 400 },
        )
      }
      galleryPatch.longitude = longitude
    }

    if (Object.keys(galleryPatch).length > 0) {
      await supabaseAdminFetch<unknown>({
        method: 'PATCH',
        path: '/rest/v1/galleries',
        query: {
          id: `eq.${payload.galleryId}`,
        },
        body: galleryPatch,
        prefer: 'return=minimal',
      })
    }

    const updatedPayload = await fetchSettingsPayload(session.email)

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      settings: updatedPayload,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Ayarlar kaydedilemedi. Lütfen tekrar deneyin.',
      },
      { status: 500 },
    )
  }
}
