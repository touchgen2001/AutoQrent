import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withSentryConfig } from '@sentry/nextjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

const supabaseImageRemotePatterns = []

for (const value of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_URL]) {
  if (!value) continue
  try {
    const parsed = new URL(value)
    supabaseImageRemotePatterns.push({
      protocol: parsed.protocol.replace(':', ''),
      hostname: parsed.hostname,
      port: parsed.port || '',
      pathname: '/storage/v1/object/public/**',
    })
  } catch {
    // Ignore invalid URL values in runtime env.
  }
}

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  'https://va.vercel-scripts.com',
  'https://*.vercel-scripts.com',
]

if (!isProduction) {
  scriptSources.push("'unsafe-eval'")
}

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  `script-src ${scriptSources.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.vercel-insights.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://*.ingest.sentry.io https://*.sentry.io",
  "frame-src 'self' https://www.openstreetmap.org https://maps.google.com https://www.google.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
]

if (isProduction) {
  cspDirectives.push('upgrade-insecure-requests')
}

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives.join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), fullscreen=(self), clipboard-write=(self)',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-site',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'off',
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    cpus: 2,
  },
  typescript: {
    // Keep `next build` fast; types are enforced separately by `pnpm typecheck`
    // (CI `verify` and the Vercel buildCommand both run it before `next build`).
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    qualities: [68, 70, 72, 75, 78, 82],
    deviceSizes: [360, 640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: supabaseImageRemotePatterns,
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
})
