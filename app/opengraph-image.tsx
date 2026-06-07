import { ImageResponse } from 'next/og'

// Root-level Open Graph image. Next.js inherits this for every page segment
// that does not define its own image, so all marketing pages (anasayfa,
// ozellikler, nasil-calisir, fiyatlar, blog, …) get a branded share card.
// Text is kept ASCII-only on purpose so the default ImageResponse font never
// renders missing-glyph boxes for Turkish diacritics.
export const alt = 'Cebindegaleri - QR Kodlu Dijital Galeri Vitrini'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
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
            'radial-gradient(circle at 80% 16%, rgba(255,255,255,0.12), rgba(255,255,255,0) 44%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              display: 'flex',
              width: '46px',
              height: '46px',
              borderRadius: '13px',
              backgroundColor: '#ffffff',
            }}
          />
          <div
            style={{
              display: 'flex',
              fontSize: '32px',
              color: '#ffffff',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            Cebindegaleri
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: '78px',
              color: '#ffffff',
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
              maxWidth: '940px',
            }}
          >
            QR Kodlu Dijital Galeri Vitrini
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: '26px',
              fontSize: '34px',
              color: '#a1a1aa',
            }}
          >
            Showroom / Stok / Lead / Analitik tek panelde
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: '28px', color: '#d4d4d8', fontWeight: 600 }}>
            cebindegaleri.com
          </div>
          <div style={{ display: 'flex', fontSize: '26px', color: '#71717a' }}>Oto Galeri CRM</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
