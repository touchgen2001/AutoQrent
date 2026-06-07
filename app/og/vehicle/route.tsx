import { ImageResponse } from 'next/og'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH } from '@/lib/brand-glyph'
import { loadRemoteImageDataUri, toBase64 } from '@/lib/og-remote-image'

// Ready-to-post social share image for a single vehicle, generated on demand for
// the dealer panel ("Sosyal medya görseli"). Formats: `square` (1080×1080, feed)
// and `story` (1080×1920, stories/status). Full-bleed car photo + brand-grade
// gradient + the gallery's own identity and a hero price.
//
// Edge runtime so the bundled Poppins font (Turkish diacritics) loads via
// fetch(new URL(..., import.meta.url)); see ../route.tsx for the rationale. All
// data arrives via query params (the same public info shown on /arac/[id]) — no
// DB access — and the photo/logo are fetched through the SSRF-guarded loader.
export const runtime = 'edge'

type FormatKey = 'square' | 'story'

type LayoutConfig = {
  width: number
  height: number
  pad: number
  markSize: number
  eyebrowSize: number
  galleryNameSize: number
  titleSize: number
  metaSize: number
  priceSize: number
  footerSize: number
}

const LAYOUTS: Record<FormatKey, LayoutConfig> = {
  square: {
    width: 1080,
    height: 1080,
    pad: 64,
    markSize: 96,
    eyebrowSize: 24,
    galleryNameSize: 36,
    titleSize: 54,
    metaSize: 30,
    priceSize: 82,
    footerSize: 28,
  },
  story: {
    width: 1080,
    height: 1920,
    pad: 84,
    markSize: 110,
    eyebrowSize: 28,
    galleryNameSize: 42,
    titleSize: 64,
    metaSize: 36,
    priceSize: 104,
    footerSize: 32,
  },
}

function clamp(value: string | null, fallback: string, max: number) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed
}

function sanitizeMonogram(value: string | null) {
  return (value || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2)
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const format: FormatKey = searchParams.get('format') === 'story' ? 'story' : 'square'
  const cfg = LAYOUTS[format]

  const title = clamp(searchParams.get('title'), 'Yayındaki Araç', 70)
  const price = clamp(searchParams.get('price'), 'Fiyat için arayın', 24)
  const meta = clamp(searchParams.get('meta'), '', 64)
  const galleryName = clamp(searchParams.get('gallery'), 'Cebindegaleri', 36)
  const eyebrow = clamp(searchParams.get('eyebrow'), 'Vitrindeki araç', 34)
  const tag = clamp(searchParams.get('tag'), 'cebindegaleri.com', 36)
  const monogram = sanitizeMonogram(searchParams.get('monogram'))

  const [poppins, brandLogo, photoSrc, galleryLogoSrc] = await Promise.all([
    fetch(new URL('../Poppins-SemiBold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL('../logo.png', import.meta.url)).then((res) => res.arrayBuffer()),
    loadRemoteImageDataUri(searchParams.get('photo'), request.url),
    loadRemoteImageDataUri(searchParams.get('logo'), request.url),
  ])

  const brandLogoSrc = `data:image/png;base64,${toBase64(brandLogo)}`

  // Long titles step down a notch so they keep to ~2 lines.
  const titleFontSize = title.length > 46 ? cfg.titleSize - 12 : title.length > 32 ? cfg.titleSize - 6 : cfg.titleSize

  const galleryMark = galleryLogoSrc ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${cfg.markSize}px`,
        minWidth: `${cfg.markSize}px`,
        padding: '0 18px',
        borderRadius: '22px',
        backgroundColor: 'rgba(255,255,255,0.96)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
      <img
        src={galleryLogoSrc}
        alt=""
        width={Math.round(cfg.markSize * 1.2)}
        height={Math.round(cfg.markSize * 0.62)}
        style={{ objectFit: 'contain' }}
      />
    </div>
  ) : (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: `${cfg.markSize}px`,
        width: `${cfg.markSize}px`,
        borderRadius: '22px',
        color: '#ffffff',
        fontSize: `${Math.round(cfg.markSize * 0.42)}px`,
        fontWeight: 600,
        border: '1px solid rgba(255,255,255,0.2)',
        backgroundImage: 'linear-gradient(152deg, #2c2c2f 0%, #161618 52%, #0a0a0a 100%)',
      }}
    >
      {monogram || 'CG'}
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
          backgroundColor: '#0a0a0a',
        }}
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image
          <img
            src={photoSrc}
            alt=""
            width={cfg.width}
            height={cfg.height}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
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
              backgroundImage:
                'radial-gradient(circle at 50% 32%, rgba(255,255,255,0.12), rgba(255,255,255,0) 55%), linear-gradient(160deg, #1a1a1c 0%, #0a0a0a 100%)',
            }}
          >
            <svg
              width={Math.round(cfg.width * 0.62)}
              height={Math.round(cfg.width * 0.62)}
              viewBox="0 0 100 100"
              fill="none"
            >
              <path
                d={BRAND_GLYPH_PATH}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={BRAND_GLYPH_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Top scrim + heavy bottom gradient so text always reads over any photo. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'linear-gradient(180deg, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.05) 22%, rgba(10,10,10,0) 40%, rgba(10,10,10,0.72) 68%, rgba(10,10,10,0.96) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: `${cfg.pad}px`,
            fontFamily: 'Poppins',
          }}
        >
          {/* Gallery identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {galleryMark}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  fontSize: `${cfg.eyebrowSize}px`,
                  color: 'rgba(255,255,255,0.72)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.16em',
                }}
              >
                {eyebrow}
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: '6px',
                  fontSize: `${cfg.galleryNameSize}px`,
                  color: '#ffffff',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                }}
              >
                {galleryName}
              </div>
            </div>
          </div>

          {/* Vehicle headline + price */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: `${titleFontSize}px`,
                color: '#ffffff',
                fontWeight: 600,
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
                maxWidth: `${cfg.width - cfg.pad * 2}px`,
              }}
            >
              {title}
            </div>

            {meta ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: `${Math.round(cfg.pad * 0.32)}px`,
                  fontSize: `${cfg.metaSize}px`,
                  color: 'rgba(255,255,255,0.82)',
                  fontWeight: 600,
                }}
              >
                {meta}
              </div>
            ) : null}

            <div
              style={{
                display: 'flex',
                marginTop: `${Math.round(cfg.pad * 0.28)}px`,
                fontSize: `${cfg.priceSize}px`,
                color: '#ffffff',
                fontWeight: 600,
                letterSpacing: '-0.03em',
              }}
            >
              {price}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: `${Math.round(cfg.pad * 0.5)}px`,
                paddingTop: `${Math.round(cfg.pad * 0.4)}px`,
                borderTop: '1px solid rgba(255,255,255,0.16)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
                <img
                  src={brandLogoSrc}
                  alt=""
                  width={Math.round(cfg.footerSize * 1.7)}
                  height={Math.round(cfg.footerSize * 1.7)}
                  style={{ borderRadius: '12px' }}
                />
                <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: '#ffffff', fontWeight: 600 }}>
                  Cebindegaleri
                </div>
              </div>
              <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: 'rgba(255,255,255,0.66)', fontWeight: 600 }}>
                {tag}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: cfg.width,
      height: cfg.height,
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
