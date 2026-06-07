import { ImageResponse } from 'next/og'

import { loadRemoteImageDataUri, toBase64 } from '@/lib/og-remote-image'

// Branded share card served at a stable URL (/og), referenced as the default
// Open Graph / Twitter image from lib/seo.ts (createPageMetadata) and the root
// layout. It accepts optional ?eyebrow=&title=&subtitle= query params so each
// page can emit a tailored card (e.g. /fiyatlar, blog posts) while pages that
// pass nothing fall back to the generic brand card.
//
// Runs on the edge runtime so the bundled Poppins font (which covers Turkish
// diacritics: s-cedilla, g-breve, dotless-i, etc.) can be loaded via
// fetch(new URL(..., import.meta.url)). The Node runtime turns that into a
// file:// URL fetch cannot read. A route handler is used rather than the
// opengraph-image.tsx file convention because that convention only applies to
// the root segment and is NOT inherited by nested marketing pages.
export const runtime = 'edge'

const WIDTH = 1200
const HEIGHT = 630

const DEFAULT_EYEBROW = 'Oto Galeri CRM'
const DEFAULT_TITLE = 'QR Kodlu Dijital Galeri Vitrini'
const DEFAULT_SUBTITLE = 'QR ile dijital vitrin, tek panelde stok ve lead yonetimi'

function clamp(value: string | null, fallback: string, max: number) {
  const trimmed = value?.trim()
  if (!trimmed) return fallback
  return trimmed.length > max ? `${trimmed.slice(0, max - 1).trimEnd()}…` : trimmed
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eyebrow = clamp(searchParams.get('eyebrow'), DEFAULT_EYEBROW, 42)
  const title = clamp(searchParams.get('title'), DEFAULT_TITLE, 84)
  const subtitle = clamp(searchParams.get('subtitle'), DEFAULT_SUBTITLE, 104)
  // Branded initials shown top-right when a gallery has no embeddable logo. The
  // value is already Turkish-cased by the caller (lib/gallery-monogram.ts); here
  // we only strip symbols and cap the length so the tile can't be abused.
  const monogram = (searchParams.get('monogram') || '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2)

  const [poppins, logo, galleryLogoSrc] = await Promise.all([
    fetch(new URL('./Poppins-SemiBold.ttf', import.meta.url)).then((res) => res.arrayBuffer()),
    fetch(new URL('./logo.png', import.meta.url)).then((res) => res.arrayBuffer()),
    loadRemoteImageDataUri(searchParams.get('logo'), request.url),
  ])

  const logoSrc = `data:image/png;base64,${toBase64(logo)}`

  // Longer titles step down so they still fit in roughly three lines.
  const titleFontSize = title.length > 54 ? 62 : title.length > 38 ? 72 : 80

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0a',
          backgroundImage:
            'radial-gradient(circle at 82% 14%, rgba(255,255,255,0.14), rgba(255,255,255,0) 46%)',
          padding: '72px',
          fontFamily: 'Poppins',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
            <img src={logoSrc} alt="" width={74} height={74} style={{ borderRadius: '18px' }} />
            <div
              style={{
                display: 'flex',
                fontSize: '34px',
                color: '#ffffff',
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Cebindegaleri
            </div>
          </div>
          {galleryLogoSrc ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '84px',
                padding: '0 22px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255,255,255,0.95)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse/Satori only supports <img>, not next/image */}
              <img src={galleryLogoSrc} alt="" width={150} height={52} style={{ objectFit: 'contain' }} />
            </div>
          ) : monogram ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '84px',
                width: '84px',
                borderRadius: '20px',
                color: '#ffffff',
                fontSize: '40px',
                fontWeight: 600,
                letterSpacing: '0.01em',
                border: '1px solid rgba(255,255,255,0.18)',
                backgroundImage:
                  'linear-gradient(152deg, #2c2c2f 0%, #161618 52%, #0a0a0a 100%)',
              }}
            >
              {monogram}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '23px',
              color: '#a1a1aa',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
            }}
          >
            {eyebrow}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: '20px',
              fontSize: `${titleFontSize}px`,
              color: '#ffffff',
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              maxWidth: '1010px',
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: '24px',
              fontSize: '31px',
              color: '#d4d4d8',
              fontWeight: 600,
              lineHeight: 1.3,
              maxWidth: '960px',
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            paddingTop: '28px',
          }}
        >
          <div style={{ display: 'flex', fontSize: '28px', color: '#ffffff', fontWeight: 600 }}>
            cebindegaleri.com
          </div>
          <div style={{ display: 'flex', fontSize: '24px', color: '#71717a', fontWeight: 600 }}>
            Showroom · Stok · Lead · Analitik
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Poppins',
          data: poppins,
          weight: 600,
          style: 'normal',
        },
      ],
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    },
  )
}
