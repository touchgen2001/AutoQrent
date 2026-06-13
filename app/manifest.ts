import type { MetadataRoute } from 'next'

import { siteConfig } from '@/lib/seo'

// Web app manifest — lets the public showroom and the dealer panel install to a
// phone home screen as a standalone, app-like experience with the Cebindegaleri
// brand icon. Next serves this at /manifest.webmanifest and links it
// automatically; the icons are produced by scripts/brand/generate-logo.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — QR Kodlu Dijital Galeri Vitrini`,
    short_name: siteConfig.name,
    description: siteConfig.defaultDescription,
    lang: 'tr',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
