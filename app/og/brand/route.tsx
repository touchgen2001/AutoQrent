import { ImageResponse } from 'next/og'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH } from '@/lib/brand-glyph'
import { loadRemoteImageDataUri, toBase64 } from '@/lib/og-remote-image'

// Brand-kit images for a dealer's social profiles, generated on demand for the
// panel ("Profil & kapak görseli"). Formats: `profile` (1080×1080, square avatar —
// content kept inside a centered safe circle so it survives Instagram/WhatsApp
// circular cropping) and `cover` (1640×624, wide banner for Facebook/WhatsApp
// Business). Brand-grade dark card with the gallery's own identity.
//
// Edge runtime so the bundled Poppins font (Turkish diacritics) loads via
// fetch(new URL(..., import.meta.url)); see ../vehicle/route.tsx for rationale.
// All data arrives via query params — no DB access — and the gallery logo is
// fetched through the SSRF-guarded loader.
export const runtime = 'edge'

type FormatKey = 'profile' | 'cover'

function clamp(value: string | null, fallback: string, max: number) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed
}

function sanitizeMonogram(value: string | null) {
  return (value || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2)
}

// Turkish thousands separator without relying on edge-runtime ICU.
function formatCount(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// Optional brand-color washes so the profile/cover can match a dealer's identity
// (the panel auto-suggests one from the gallery logo). Text/marks stay white; only
// the card background + radial sheen change. `koyu` is the default neutral dark.
type BrandTheme = { bg: string; backdrop: string; watermark: string }
const THEMES: Record<string, BrandTheme> = {
  koyu: {
    bg: '#0a0a0a',
    backdrop:
      'radial-gradient(circle at 50% 30%, rgba(255,255,255,0.12), rgba(255,255,255,0) 55%), linear-gradient(160deg, #1a1a1c 0%, #0a0a0a 100%)',
    watermark: 'rgba(255,255,255,0.05)',
  },
  lacivert: {
    bg: '#0b1633',
    backdrop:
      'radial-gradient(circle at 50% 30%, rgba(120,150,255,0.18), rgba(255,255,255,0) 55%), linear-gradient(160deg, #1e3a8a 0%, #0b1633 100%)',
    watermark: 'rgba(186,205,255,0.07)',
  },
  bordo: {
    bg: '#2c0a0d',
    backdrop:
      'radial-gradient(circle at 50% 30%, rgba(255,150,150,0.16), rgba(255,255,255,0) 55%), linear-gradient(160deg, #7f1d1d 0%, #2c0a0d 100%)',
    watermark: 'rgba(255,200,200,0.07)',
  },
}

function resolveTheme(value: string | null): BrandTheme {
  const key = (value || '').toLowerCase()
  return Object.prototype.hasOwnProperty.call(THEMES, key) ? THEMES[key] : THEMES.koyu
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const format: FormatKey = searchParams.get('format') === 'cover' ? 'cover' : 'profile'

  const galleryName = clamp(searchParams.get('gallery'), 'Cebindegaleri', 36)
  const tagline = clamp(searchParams.get('tagline'), '', 80)
  const city = clamp(searchParams.get('city'), '', 40)
  const tag = clamp(searchParams.get('tag'), 'cebindegaleri.com', 40)
  const monogram = sanitizeMonogram(searchParams.get('monogram'))

  const countRaw = Number(searchParams.get('count'))
  const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 0

  const theme = resolveTheme(searchParams.get('theme'))

  const [poppins, brandLogo, galleryLogoSrc] = await Promise.all([
    fetch(new URL('../Poppins-SemiBold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL('../logo.png', import.meta.url)).then((res) => res.arrayBuffer()),
    loadRemoteImageDataUri(searchParams.get('logo'), request.url),
  ])

  const brandLogoSrc = `data:image/png;base64,${toBase64(brandLogo)}`

  const width = format === 'profile' ? 1080 : 1640
  const height = format === 'profile' ? 1080 : 624
  const markSize = format === 'profile' ? 220 : 150

  const galleryMark = galleryLogoSrc ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${markSize}px`,
        minWidth: `${markSize}px`,
        padding: '0 26px',
        borderRadius: '32px',
        backgroundColor: 'rgba(255,255,255,0.96)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
      <img
        src={galleryLogoSrc}
        alt=""
        width={Math.round(markSize * 1.3)}
        height={Math.round(markSize * 0.66)}
        style={{ objectFit: 'contain' }}
      />
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${markSize}px`,
        width: `${markSize}px`,
        borderRadius: '32px',
        color: '#ffffff',
        fontSize: `${Math.round(markSize * 0.42)}px`,
        fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundImage: 'linear-gradient(152deg, #2c2c2f 0%, #161618 52%, #0a0a0a 100%)',
      }}
    >
      {monogram || 'CG'}
    </div>
  )

  const backdrop = (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: theme.backdrop,
      }}
    >
      <svg width={Math.round(width * 0.5)} height={Math.round(width * 0.5)} viewBox="0 0 100 100" fill="none">
        <path
          d={BRAND_GLYPH_PATH}
          stroke={theme.watermark}
          strokeWidth={BRAND_GLYPH_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )

  const profileContent = (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '96px',
        fontFamily: 'Poppins',
      }}
    >
      {galleryMark}
      <div
        style={{
          display: 'flex',
          marginTop: '44px',
          fontSize: '72px',
          color: '#ffffff',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          textAlign: 'center',
          maxWidth: '860px',
          lineHeight: 1.05,
        }}
      >
        {galleryName}
      </div>
      {count > 0 || city ? (
        <div
          style={{
            display: 'flex',
            marginTop: '22px',
            fontSize: '34px',
            color: 'rgba(255,255,255,0.78)',
            fontWeight: 600,
          }}
        >
          {[count > 0 ? `${formatCount(count)} araç` : '', city].filter(Boolean).join(' · ')}
        </div>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginTop: '40px',
          padding: '12px 26px',
          borderRadius: '999px',
          border: '1px solid rgba(255,255,255,0.16)',
          backgroundColor: 'rgba(255,255,255,0.05)',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
        <img src={brandLogoSrc} alt="" width={34} height={34} style={{ borderRadius: '9px' }} />
        <div style={{ display: 'flex', fontSize: '28px', color: 'rgba(255,255,255,0.82)', fontWeight: 600 }}>
          Cebindegaleri
        </div>
      </div>
    </div>
  )

  const coverContent = (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '92px',
        fontFamily: 'Poppins',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '900px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {galleryMark}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '26px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 600,
                letterSpacing: '0.16em',
              }}
            >
              VİTRİN
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: '8px',
                fontSize: '58px',
                color: '#ffffff',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.04,
              }}
            >
              {galleryName}
            </div>
          </div>
        </div>
        {tagline ? (
          <div
            style={{
              display: 'flex',
              marginTop: '34px',
              fontSize: '34px',
              color: 'rgba(255,255,255,0.82)',
              fontWeight: 600,
              lineHeight: 1.25,
              maxWidth: '860px',
            }}
          >
            {tagline}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        {count > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div
              style={{
                display: 'flex',
                fontSize: '150px',
                color: '#ffffff',
                fontWeight: 600,
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {formatCount(count)}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: '6px',
                fontSize: '36px',
                color: 'rgba(255,255,255,0.82)',
                fontWeight: 600,
              }}
            >
              araç vitrinde
            </div>
          </div>
        ) : null}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            marginTop: '40px',
            padding: '14px 28px',
            borderRadius: '999px',
            border: '1px solid rgba(255,255,255,0.16)',
            backgroundColor: 'rgba(255,255,255,0.05)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
          <img src={brandLogoSrc} alt="" width={38} height={38} style={{ borderRadius: '10px' }} />
          <div style={{ display: 'flex', fontSize: '30px', color: 'rgba(255,255,255,0.88)', fontWeight: 600 }}>
            {tag}
          </div>
        </div>
      </div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: theme.bg,
        }}
      >
        {backdrop}
        {format === 'profile' ? profileContent : coverContent}
      </div>
    ),
    {
      width,
      height,
      fonts: [
        {
          name: 'Poppins',
          data: poppins,
          weight: 600,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
      },
    },
  )
}
