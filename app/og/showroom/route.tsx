import { ImageResponse } from 'next/og'

import { BRAND_GLYPH_PATH, BRAND_GLYPH_STROKE_WIDTH } from '@/lib/brand-glyph'
import { buildQrPath } from '@/lib/og-qr'
import { loadRemoteImageDataUri, toBase64 } from '@/lib/og-remote-image'
import { WHATSAPP_GLYPH_PATH } from '@/lib/social-glyphs'

// Ready-to-post promo image for a dealer's whole showroom, generated on demand
// for the panel ("Vitrin tanıtım görseli"). Formats: `square` (1080×1080, feed)
// and `story` (1080×1920, stories/status). Brand-grade dark card: gallery
// identity, an "N araç vitrinde" headline, up to three highlighted vehicles, and
// the showroom link in the footer.
//
// Edge runtime so the bundled Poppins font (Turkish diacritics) loads via
// fetch(new URL(..., import.meta.url)); see ../vehicle/route.tsx for rationale.
// All data arrives via query params (the same public info shown on the showroom)
// — no DB access — and every photo/logo is fetched through the SSRF-guarded
// loader.
export const runtime = 'edge'

type FormatKey = 'square' | 'story'

type LayoutConfig = {
  width: number
  height: number
  pad: number
  markSize: number
  eyebrowSize: number
  galleryNameSize: number
  countSize: number
  headlineSize: number
  sectionSize: number
  rowTitleSize: number
  rowPriceSize: number
  thumbSize: number
  footerSize: number
  rowGap: number
}

const LAYOUTS: Record<FormatKey, LayoutConfig> = {
  square: {
    width: 1080,
    height: 1080,
    pad: 64,
    markSize: 88,
    eyebrowSize: 22,
    galleryNameSize: 34,
    countSize: 150,
    headlineSize: 46,
    sectionSize: 24,
    rowTitleSize: 30,
    rowPriceSize: 30,
    thumbSize: 96,
    footerSize: 26,
    rowGap: 16,
  },
  story: {
    width: 1080,
    height: 1920,
    pad: 84,
    markSize: 104,
    eyebrowSize: 26,
    galleryNameSize: 40,
    countSize: 210,
    headlineSize: 58,
    sectionSize: 30,
    rowTitleSize: 38,
    rowPriceSize: 38,
    thumbSize: 128,
    footerSize: 30,
    rowGap: 22,
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

// Turkish thousands separator without relying on edge-runtime ICU.
function formatCount(value: number) {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  const format: FormatKey = searchParams.get('format') === 'story' ? 'story' : 'square'
  const cfg = LAYOUTS[format]

  const galleryName = clamp(searchParams.get('gallery'), 'Cebindegaleri', 36)
  const tag = clamp(searchParams.get('tag'), 'cebindegaleri.com', 36)
  const monogram = sanitizeMonogram(searchParams.get('monogram'))
  const phone = (searchParams.get('phone') || '').trim().slice(0, 24)

  const qrSizeModules = Number(searchParams.get('qrN'))
  const qrPath = buildQrPath(searchParams.get('qr'), Number.isFinite(qrSizeModules) ? qrSizeModules : 0)
  const qrCardSize = format === 'story' ? 168 : 132

  const countRaw = Number(searchParams.get('count'))
  const count = Number.isFinite(countRaw) && countRaw > 0 ? Math.floor(countRaw) : 0
  // Subtitle under the big count. Defaults to the evergreen "araç vitrinde";
  // the weekly preset passes "araç bu hafta eklendi".
  const headline = clamp(searchParams.get('headline'), 'araç vitrinde', 28)

  const itemTitles = searchParams.getAll('itemTitle').slice(0, 3)
  const itemPrices = searchParams.getAll('itemPrice')
  const itemPhotos = searchParams.getAll('itemPhoto')

  const [poppins, brandLogo, galleryLogoSrc, itemPhotoSrcs] = await Promise.all([
    fetch(new URL('../Poppins-SemiBold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL('../logo.png', import.meta.url)).then((res) => res.arrayBuffer()),
    loadRemoteImageDataUri(searchParams.get('logo'), request.url),
    Promise.all(itemTitles.map((_, index) => loadRemoteImageDataUri(itemPhotos[index] ?? null, request.url))),
  ])

  const brandLogoSrc = `data:image/png;base64,${toBase64(brandLogo)}`

  const items = itemTitles.map((title, index) => ({
    title: clamp(title, 'Araç', 36),
    price: clamp(itemPrices[index] ?? null, '', 24),
    photo: itemPhotoSrcs[index] ?? null,
  }))

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
        {/* Brand-grade dark backdrop with a faint brand-G watermark. */}
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
              'radial-gradient(circle at 50% 28%, rgba(255,255,255,0.12), rgba(255,255,255,0) 55%), linear-gradient(160deg, #1a1a1c 0%, #0a0a0a 100%)',
          }}
        >
          <svg
            width={Math.round(cfg.width * 0.66)}
            height={Math.round(cfg.width * 0.66)}
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
          {/* Gallery identity + optional showroom QR */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {galleryMark}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: `${cfg.eyebrowSize}px`,
                    color: 'rgba(255,255,255,0.72)',
                    fontWeight: 600,
                    letterSpacing: '0.16em',
                  }}
                >
                  VİTRİN
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

            {qrPath ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px',
                  borderRadius: '22px',
                  backgroundColor: '#ffffff',
                }}
              >
                <svg width={qrCardSize} height={qrCardSize} viewBox={`0 0 ${qrSizeModules} ${qrSizeModules}`}>
                  <path d={qrPath} fill="#0a0a0a" />
                </svg>
                <div
                  style={{
                    display: 'flex',
                    fontSize: `${Math.round(cfg.footerSize * 0.74)}px`,
                    color: '#0a0a0a',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  Vitrini aç
                </div>
              </div>
            ) : null}
          </div>

          {/* Count headline + highlighted vehicles */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {count > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    display: 'flex',
                    fontSize: `${cfg.countSize}px`,
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
                    marginTop: `${Math.round(cfg.pad * 0.12)}px`,
                    fontSize: `${cfg.headlineSize}px`,
                    color: 'rgba(255,255,255,0.86)',
                    fontWeight: 600,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {headline}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  fontSize: `${cfg.headlineSize}px`,
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                Vitrinimizdeki araçlar
              </div>
            )}

            {items.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginTop: `${Math.round(cfg.pad * 0.6)}px` }}>
                <div
                  style={{
                    display: 'flex',
                    marginBottom: `${Math.round(cfg.rowGap * 0.9)}px`,
                    fontSize: `${cfg.sectionSize}px`,
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                  }}
                >
                  Öne çıkan araçlar
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: `${cfg.rowGap}px` }}>
                  {items.map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '20px',
                        padding: `${Math.round(cfg.rowGap * 0.85)}px ${Math.round(cfg.rowGap * 1.1)}px`,
                        borderRadius: '20px',
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {item.photo ? (
                          <div
                            style={{
                              display: 'flex',
                              width: `${cfg.thumbSize}px`,
                              height: `${cfg.thumbSize}px`,
                              borderRadius: '16px',
                              overflow: 'hidden',
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
                            <img
                              src={item.photo}
                              alt=""
                              width={cfg.thumbSize}
                              height={cfg.thumbSize}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: `${cfg.thumbSize}px`,
                              height: `${cfg.thumbSize}px`,
                              borderRadius: '16px',
                              border: '1px solid rgba(255,255,255,0.12)',
                              backgroundImage: 'linear-gradient(152deg, #2c2c2f 0%, #0a0a0a 100%)',
                            }}
                          >
                            <svg
                              width={Math.round(cfg.thumbSize * 0.5)}
                              height={Math.round(cfg.thumbSize * 0.5)}
                              viewBox="0 0 100 100"
                              fill="none"
                            >
                              <path
                                d={BRAND_GLYPH_PATH}
                                stroke="rgba(255,255,255,0.28)"
                                strokeWidth={BRAND_GLYPH_STROKE_WIDTH}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                        <div
                          style={{
                            display: 'flex',
                            fontSize: `${cfg.rowTitleSize}px`,
                            color: '#ffffff',
                            fontWeight: 600,
                            letterSpacing: '-0.01em',
                            maxWidth: `${cfg.width - cfg.pad * 2 - cfg.thumbSize - 200}px`,
                          }}
                        >
                          {item.title}
                        </div>
                      </div>

                      {item.price ? (
                        <div
                          style={{
                            display: 'flex',
                            fontSize: `${cfg.rowPriceSize}px`,
                            color: '#ffffff',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                          }}
                        >
                          {item.price}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer: brand + showroom link */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
              {phone ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: `${Math.round(cfg.footerSize * 0.36)}px ${Math.round(cfg.footerSize * 0.66)}px`,
                    borderRadius: '999px',
                    backgroundColor: '#25d366',
                  }}
                >
                  <svg
                    width={Math.round(cfg.footerSize * 1.1)}
                    height={Math.round(cfg.footerSize * 1.1)}
                    viewBox="0 0 24 24"
                  >
                    <path d={WHATSAPP_GLYPH_PATH} fill="#ffffff" />
                  </svg>
                  <div style={{ display: 'flex', fontSize: `${cfg.footerSize}px`, color: '#ffffff', fontWeight: 600 }}>
                    {phone}
                  </div>
                </div>
              ) : null}
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
