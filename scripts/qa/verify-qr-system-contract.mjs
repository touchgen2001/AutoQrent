#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relPath) {
  return fs.readFileSync(path.join(projectRoot, relPath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function hasAll(content, needles) {
  return needles.every((needle) => content.includes(needle))
}

const packageJson = read('package.json')
const predeploy = read('scripts/security/predeploy-check.mjs')
const qrImageRoute = read('app/api/panel/qr-image/route.ts')
const qrCodeImage = read('components/shared/qr-code-image.tsx')
const qrPage = read('app/panel/qr-kodlar/page.tsx')
const qrPrintPage = read('app/panel/qr-kodlar/yazdir/page.tsx')
const panelRepository = read('lib/server/panel-repository.ts')
const vehicleEventsRoute = read('app/api/public/vehicle-events/route.ts')
const publicRouteToken = read('lib/security/public-route-token.ts')
const realFlowSmoke = read('scripts/qa/real-user-flow-smoke.mjs')
const prodSmoke = read('scripts/qa/prod-smoke-full.mjs')
const qrFlow = read('scripts/qa/verify-qr-flow.mjs')

const checks = [
  [
    'qr image route renders standards-compliant svg through qrcode library',
    hasAll(qrImageRoute, [
      "import QRCode from 'qrcode'",
      'QRCode.toString',
      "type: 'svg'",
      'width: parsed.data.size',
      'margin: 2',
      "errorCorrectionLevel: 'H'",
      "dark: '#000000'",
      "light: '#ffffff'",
      'image/svg+xml; charset=utf-8',
      'x-content-type-options',
    ]),
  ],
  [
    'qr image route overlays the brand badge in the code centre',
    hasAll(qrImageRoute, ["import { injectBrandBadge } from '@/lib/qr-logo'", 'injectBrandBadge(baseSvg)']),
  ],
  [
    'qr image route is protected and only accepts trusted secure vehicle urls',
    hasAll(qrImageRoute, [
      'requirePanelSessionOrThrow',
      'getTrustedMutationOrigins',
      "segments[0] !== 'arac'",
      "parsedUrl.searchParams.get('src') !== 'qr'",
      'hasSecurePublicRouteToken(routeId)',
      'MAX_PUBLIC_ROUTE_SLUG_LENGTH',
      'QR sadece güvenli araç linkleri için üretilebilir.',
    ]),
  ],
  [
    'shared qr component uses protected image endpoint instead of decorative icon output',
    hasAll(qrCodeImage, [
      '/api/panel/qr-image?url=',
      'encodeURIComponent(value)',
      'unoptimized',
      'loading="eager"',
      'alt={alt}',
    ]),
  ],
  [
    'panel qr list renders real qr image from vehicle public url',
    qrPage.includes('<QrCodeImage')
      && qrPage.includes('value={vehicle.publicUrl}')
      && qrPage.includes('href={vehicle.publicUrl}')
      && qrPage.includes('validSelectedVehicleIds.length > 0 ?'),
  ],
  [
    'print templates render real qr image from vehicle public url',
    qrPrintPage.match(/<QrCodeImage/g)?.length >= 4
      && qrPrintPage.includes('value={vehicle.publicUrl}')
      && qrPrintPage.includes('/arac/{vehicle.routeId}?src=qr'),
  ],
  [
    'qr public url is derived from secure route id with src qr',
    hasAll(panelRepository, [
      'getQrCodeFromRouteId(routeId)',
      'const routeId = vehicle.slug || vehicle.id',
      'publicUrl: absoluteUrl(`/arac/${routeId}?src=qr`)',
    ])
      && !panelRepository.includes('getQrCodeFromVehicleId'),
  ],
  [
    'secure public route token is long random hex suffix',
    hasAll(publicRouteToken, [
      'PUBLIC_ROUTE_TOKEN_BYTES = 16',
      "randomBytes(bytes).toString('hex')",
      'SECURE_TOKEN_SUFFIX_PATTERN',
      'SAFE_PUBLIC_SLUG_PATTERN',
      'MAX_PUBLIC_ROUTE_SLUG_LENGTH = 120',
    ]),
  ],
  [
    'qr scan event endpoint rejects insecure route tokens and resolves active vehicle by slug',
    hasAll(vehicleEventsRoute, [
      'vehicleRouteId',
      'refine(hasSecurePublicRouteToken',
      'MAX_PUBLIC_ROUTE_SLUG_LENGTH',
      'slug: `eq.${vehicleRouteId.trim()}`',
      "status: 'eq.active'",
    ])
      && !vehicleEventsRoute.includes('z.string().uuid'),
  ],
  [
    'qr scan endpoint records view and qr scan separately',
    hasAll(vehicleEventsRoute, [
      "eventType === 'view'",
      "path: '/rest/v1/vehicle_views'",
      "eventType === 'view' && source === 'qr'",
      "path: '/rest/v1/qr_scans'",
      'ip_hash: ipHash',
      'ua_hash: uaHash',
      "area: 'qr'",
    ]),
  ],
  [
    'real user smoke verifies qr route, scan, lead source, analytics and audit trail',
    hasAll(realFlowSmoke, [
      '/api/panel/qr-codes',
      '/arac/${encodeURIComponent(qrVehicle.routeId)}?src=qr',
      '/api/public/vehicle-events',
      "source: 'qr'",
      'QR scan panelde artmadi',
      "lead.source === 'qr'",
      'analytics totalScans artmadi',
      'Public arac CTA eventi panel audit logda gorunmedi',
    ]),
  ],
  [
    'prod smoke verifies live qr svg generation and legacy route rejection',
    hasAll(prodSmoke, [
      'function svgQrOk',
      "contentType.includes('image/svg+xml')",
      "result.text.includes('<svg')",
      "result.text.includes('<path')",
      'auth panel qr image generates real svg',
      'auth panel qr image rejects legacy route',
      '/api/panel/qr-image',
      '/arac/demo?src=qr',
    ]),
  ],
  [
    'manual qr flow script verifies route based scan increment',
    hasAll(qrFlow, [
      '/api/panel/qr-codes',
      'target.routeId',
      '/arac/${encodeURIComponent(target.routeId)}?src=qr',
      'vehicleRouteId: target.routeId',
      'afterScans > beforeScans',
    ]),
  ],
  [
    'qr qa scripts avoid local next server fanout',
    !prodSmoke.includes('next start')
      && !prodSmoke.includes('next dev')
      && !realFlowSmoke.includes('next start')
      && !realFlowSmoke.includes('next dev')
      && !qrFlow.includes('next start')
      && !qrFlow.includes('next dev'),
  ],
  [
    'package exposes qr system quality gate',
    packageJson.includes('"quality:qr-system": "node scripts/qa/verify-qr-system-contract.mjs"'),
  ],
  [
    'predeploy requires qr system contract',
    predeploy.includes('guard.qr_system_quality_contract')
      && predeploy.includes('scripts/qa/verify-qr-system-contract.mjs')
      && predeploy.includes('"quality:qr-system"'),
  ],
]

for (const [label, ok] of checks) {
  assert(ok, label)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: checks.map(([label]) => label),
    },
    null,
    2,
  ),
)
