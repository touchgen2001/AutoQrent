import { ImageResponse } from 'next/og'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH } from '@/lib/brand-glyph'
import { buildQrPath } from '@/lib/og-qr'
import { loadRemoteImageDataUri, toBase64 } from '@/lib/og-remote-image'
import { WHATSAPP_GLYPH_PATH } from '@/lib/social-glyphs'

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

// Optional corner badge. Known keys map to fixed Turkish labels (correct
// diacritics baked in, so no edge-runtime locale casing needed); any other short
// text is accepted as-is and capped.
const BADGE_LABELS: Record<string, string> = {
  firsat: 'FIRSAT',
  satildi: 'SATILDI',
  yeni: 'YENİ',
  rezerve: 'REZERVE',
  'fiyat-dustu': 'FİYAT DÜŞTÜ',
}

function resolveBadge(value: string | null) {
  const raw = (value || '').trim()
  if (!raw) return ''
  const mapped = BADGE_LABELS[raw.toLowerCase()]
  if (mapped) return mapped
  return raw.slice(0, 14).toUpperCase()
}

// Background/treatment themes so a dealer's posts don't all look identical. The
// car photo stays full-bleed in every theme; only the overlay gradient, text ink,
// and framing change. `koyu` is the original dark treatment (default); `lacivert`
// and `bordo` add a colored wash so a dealer can match their brand identity.
type ThemeKey = 'koyu' | 'acik' | 'cerceve' | 'lacivert' | 'bordo'

type ThemeConfig = {
  overlay: string
  ink: string
  inkSoft: string
  inkFaint: string
  eyebrow: string
  hairline: string
  chipBackground: string
  chipBorder: string
  chipInk: string
  badgeBackground: string
  badgeInk: string
  frame: boolean
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  koyu: {
    overlay:
      'linear-gradient(180deg, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.05) 22%, rgba(10,10,10,0) 40%, rgba(10,10,10,0.72) 68%, rgba(10,10,10,0.96) 100%)',
    ink: '#ffffff',
    inkSoft: 'rgba(255,255,255,0.82)',
    inkFaint: 'rgba(255,255,255,0.66)',
    eyebrow: 'rgba(255,255,255,0.72)',
    hairline: 'rgba(255,255,255,0.16)',
    chipBackground: 'linear-gradient(152deg, #2c2c2f 0%, #161618 52%, #0a0a0a 100%)',
    chipBorder: 'rgba(255,255,255,0.2)',
    chipInk: '#ffffff',
    badgeBackground: '#ffffff',
    badgeInk: '#0a0a0a',
    frame: false,
  },
  acik: {
    overlay:
      'linear-gradient(180deg, rgba(248,248,250,0.72) 0%, rgba(248,248,250,0.12) 24%, rgba(248,248,250,0) 42%, rgba(248,248,250,0.82) 66%, rgba(248,248,250,0.98) 100%)',
    ink: '#0a0a0a',
    inkSoft: 'rgba(10,10,10,0.74)',
    inkFaint: 'rgba(10,10,10,0.55)',
    eyebrow: 'rgba(10,10,10,0.6)',
    hairline: 'rgba(10,10,10,0.14)',
    chipBackground: 'linear-gradient(152deg, #f4f4f5 0%, #e4e4e7 100%)',
    chipBorder: 'rgba(10,10,10,0.1)',
    chipInk: '#0a0a0a',
    badgeBackground: '#0a0a0a',
    badgeInk: '#ffffff',
    frame: false,
  },
  cerceve: {
    overlay:
      'linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.04) 24%, rgba(10,10,10,0) 44%, rgba(10,10,10,0.66) 70%, rgba(10,10,10,0.92) 100%)',
    ink: '#ffffff',
    inkSoft: 'rgba(255,255,255,0.82)',
    inkFaint: 'rgba(255,255,255,0.66)',
    eyebrow: 'rgba(255,255,255,0.72)',
    hairline: 'rgba(255,255,255,0.2)',
    chipBackground: 'linear-gradient(152deg, #2c2c2f 0%, #161618 52%, #0a0a0a 100%)',
    chipBorder: 'rgba(255,255,255,0.2)',
    chipInk: '#ffffff',
    badgeBackground: '#ffffff',
    badgeInk: '#0a0a0a',
    frame: true,
  },
  lacivert: {
    overlay:
      'linear-gradient(180deg, rgba(10,16,40,0.68) 0%, rgba(10,16,40,0.08) 24%, rgba(10,16,40,0) 42%, rgba(10,16,40,0.76) 68%, rgba(8,12,32,0.97) 100%)',
    ink: '#ffffff',
    inkSoft: 'rgba(255,255,255,0.82)',
    inkFaint: 'rgba(214,222,255,0.66)',
    eyebrow: 'rgba(198,210,255,0.8)',
    hairline: 'rgba(180,196,255,0.22)',
    chipBackground: 'linear-gradient(152deg, #1e3a8a 0%, #16276b 52%, #0b1633 100%)',
    chipBorder: 'rgba(160,180,255,0.34)',
    chipInk: '#ffffff',
    badgeBackground: '#2563eb',
    badgeInk: '#ffffff',
    frame: false,
  },
  bordo: {
    overlay:
      'linear-gradient(180deg, rgba(46,10,18,0.68) 0%, rgba(46,10,18,0.08) 24%, rgba(46,10,18,0) 42%, rgba(46,10,18,0.76) 68%, rgba(36,8,14,0.97) 100%)',
    ink: '#ffffff',
    inkSoft: 'rgba(255,255,255,0.82)',
    inkFaint: 'rgba(255,219,219,0.66)',
    eyebrow: 'rgba(255,205,205,0.82)',
    hairline: 'rgba(255,190,190,0.22)',
    chipBackground: 'linear-gradient(152deg, #7f1d1d 0%, #5f1417 52%, #2c0a0d 100%)',
    chipBorder: 'rgba(255,180,180,0.32)',
    chipInk: '#ffffff',
    badgeBackground: '#b91c1c',
    badgeInk: '#ffffff',
    frame: false,
  },
}

function resolveTheme(value: string | null): ThemeConfig {
  const key = (value || '').toLowerCase()
  if (key && Object.prototype.hasOwnProperty.call(THEMES, key)) {
    return THEMES[key as ThemeKey]
  }
  return THEMES.koyu
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
  const badge = resolveBadge(searchParams.get('badge'))
  const theme = resolveTheme(searchParams.get('theme'))
  const phone = (searchParams.get('phone') || '').trim().slice(0, 24)

  const qrSizeModules = Number(searchParams.get('qrN'))
  const qrPath = buildQrPath(searchParams.get('qr'), Number.isFinite(qrSizeModules) ? qrSizeModules : 0)
  const qrCardSize = format === 'story' ? 196 : 150

  // Multi-word / long badges (e.g. "FİYAT DÜŞTÜ") need tighter tracking so the
  // pill doesn't run off the card.
  const badgeLong = badge.length > 6 || badge.includes(' ')
  const badgeFontSize = Math.round(cfg.eyebrowSize * (badgeLong ? 1.0 : 1.25))
  const badgeTracking = badgeLong ? '0.1em' : '0.18em'

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
        color: theme.chipInk,
        fontSize: `${Math.round(cfg.markSize * 0.42)}px`,
        fontWeight: 600,
        border: `1px solid ${theme.chipBorder}`,
        backgroundImage: theme.chipBackground,
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
            backgroundImage: theme.overlay,
          }}
        />

        {theme.frame ? (
          <div
            style={{
              position: 'absolute',
              top: `${Math.round(cfg.pad * 0.5)}px`,
              left: `${Math.round(cfg.pad * 0.5)}px`,
              right: `${Math.round(cfg.pad * 0.5)}px`,
              bottom: `${Math.round(cfg.pad * 0.5)}px`,
              border: '2px solid rgba(255,255,255,0.55)',
              borderRadius: '30px',
            }}
          />
        ) : null}

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
          {/* Gallery identity + optional corner badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {galleryMark}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: `${cfg.eyebrowSize}px`,
                    color: theme.eyebrow,
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
                    color: theme.ink,
                    fontWeight: 600,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {galleryName}
                </div>
              </div>
            </div>

            {badge ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: `${Math.round(cfg.eyebrowSize * 0.55)}px ${Math.round(cfg.eyebrowSize * 1.1)}px`,
                  borderRadius: '999px',
                  backgroundColor: theme.badgeBackground,
                  color: theme.badgeInk,
                  fontSize: `${badgeFontSize}px`,
                  fontWeight: 600,
                  letterSpacing: badgeTracking,
                  whiteSpace: 'nowrap',
                }}
              >
                {badge}
              </div>
            ) : null}
          </div>

          {/* Vehicle headline + price */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontSize: `${titleFontSize}px`,
                color: theme.ink,
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
                  color: theme.inkSoft,
                  fontWeight: 600,
                }}
              >
                {meta}
              </div>
            ) : null}

            {/* Price (+ WhatsApp contact) on the left, scannable QR card on the right */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: `${Math.round(cfg.pad * 0.3)}px`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: `${cfg.priceSize}px`,
                    color: theme.ink,
                    fontWeight: 600,
                    letterSpacing: '-0.03em',
                  }}
                >
                  {price}
                </div>

                {phone ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginTop: `${Math.round(cfg.pad * 0.26)}px`,
                      padding: `${Math.round(cfg.footerSize * 0.4)}px ${Math.round(cfg.footerSize * 0.72)}px`,
                      borderRadius: '999px',
                      backgroundColor: '#25d366',
                    }}
                  >
                    <svg
                      width={Math.round(cfg.footerSize * 1.12)}
                      height={Math.round(cfg.footerSize * 1.12)}
                      viewBox="0 0 24 24"
                    >
                      <path d={WHATSAPP_GLYPH_PATH} fill="#ffffff" />
                    </svg>
                    <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: '#ffffff', fontWeight: 600 }}>
                      {phone}
                    </div>
                  </div>
                ) : null}
              </div>

              {qrPath ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '24px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <svg
                    width={qrCardSize}
                    height={qrCardSize}
                    viewBox={`0 0 ${qrSizeModules} ${qrSizeModules}`}
                  >
                    <path d={qrPath} fill="#0a0a0a" />
                  </svg>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: `${Math.round(cfg.footerSize * 0.76)}px`,
                      color: '#0a0a0a',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Karekodu okut
                  </div>
                </div>
              ) : null}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: `${Math.round(cfg.pad * 0.5)}px`,
                paddingTop: `${Math.round(cfg.pad * 0.4)}px`,
                borderTop: `1px solid ${theme.hairline}`,
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
                <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: theme.ink, fontWeight: 600 }}>
                  Cebindegaleri
                </div>
              </div>
              <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: theme.inkFaint, fontWeight: 600 }}>
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
