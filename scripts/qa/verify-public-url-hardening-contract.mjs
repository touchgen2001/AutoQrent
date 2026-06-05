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

const panelRepository = read('lib/server/panel-repository.ts')
const panelAuth = read('lib/server/panel-auth.ts')
const panelSettingsRoute = read('app/api/panel/settings/route.ts')
const panelSettingsPage = read('app/panel/ayarlar/page.tsx')
const publicRouteToken = read('lib/security/public-route-token.ts')
const publicSlugRotation = read('lib/server/public-slug-rotation.ts')
const publicShowroom = read('lib/public-showroom.ts')
const publicVehicleSeo = read('lib/public-vehicle-seo.ts')
const rotatePublicSlugs = read('scripts/security/rotate-public-route-slugs.mjs')
const rotatePublicSlugsRoute = read('app/api/cron/rotate-public-slugs/route.ts')
const vehicleEventsRoute = read('app/api/public/vehicle-events/route.ts')
const publicVehicleClient = read('components/public/public-vehicle-page-client.tsx')
const qrFlow = read('scripts/qa/verify-qr-flow.mjs')
const demoPage = read('app/demo/page.tsx')
const predeploy = read('scripts/security/predeploy-check.mjs')

const checks = [
  ['public route helper uses crypto random token', publicRouteToken.includes("randomBytes(bytes).toString('hex')")],
  ['public route helper uses 16 byte suffix', publicRouteToken.includes('PUBLIC_ROUTE_TOKEN_BYTES = 16')],
  ['existing public slug rotation script is guarded', rotatePublicSlugs.includes("ROTATE_PUBLIC_ROUTE_SLUGS_CONFIRM === 'YES'")],
  ['existing public slug rotation supports temp env file', rotatePublicSlugs.includes('ROTATE_PUBLIC_ROUTE_SLUGS_ENV_FILE')],
  ['existing public slug rotation invalidates galleries and vehicles', rotatePublicSlugs.includes("table: 'galleries'") && rotatePublicSlugs.includes("table: 'vehicles'")],
  ['existing public slug rotation is sequential', !rotatePublicSlugs.includes('Promise.all(rows') && rotatePublicSlugs.includes('for (const row of rows)')],
  ['existing public slug rotation verifies secure suffixes', rotatePublicSlugs.includes('verifySecureSlugs') && rotatePublicSlugs.includes('hasSecurePublicRouteToken(row.slug)')],
  ['runtime slug rotation endpoint requires enable flag and secret', rotatePublicSlugsRoute.includes("MAINTENANCE_SLUG_ROTATE_ENABLED === 'YES'") && rotatePublicSlugsRoute.includes('MAINTENANCE_SLUG_ROTATE_SECRET') && rotatePublicSlugsRoute.includes('authorization !== `Bearer ${rotateSecret}`')],
  ['runtime slug rotation uses shared server helper', rotatePublicSlugsRoute.includes('rotateExistingPublicRouteSlugs')],
  ['runtime slug rotation updates galleries and vehicles sequentially', publicSlugRotation.includes("table: 'galleries'") && publicSlugRotation.includes("table: 'vehicles'") && publicSlugRotation.includes('for (const row of rows)')],
  ['runtime slug rotation verifies secure suffixes', publicSlugRotation.includes('verifySecureSlugs') && publicSlugRotation.includes('hasSecurePublicRouteToken(row.slug || \'\')')],
  ['new vehicle route uses shared secure slug helper', panelRepository.includes("buildSecurePublicSlug(`${input.brand}-${input.model}-${input.year}`, 'arac')")],
  ['new vehicle route no longer uses timestamp suffix', !panelRepository.includes("Date.now().toString().slice(-6)")],
  ['qr display code is derived from route id', panelRepository.includes('getQrCodeFromRouteId') && !panelRepository.includes('getQrCodeFromVehicleId')],
  ['public vehicle page resolves by slug only', publicVehicleSeo.includes('slug: `eq.${normalized}`') && !publicVehicleSeo.includes('id: `eq.${normalized}`')],
  ['public vehicle page rejects insecure route params before lookup', publicVehicleSeo.includes("import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'") && publicVehicleSeo.includes('if (!hasSecurePublicRouteToken(normalized)) return null')],
  ['public vehicle detail does not expose internal stock uuid', publicVehicleSeo.includes('stockId: routeId')],
  ['new gallery showroom route uses shared secure slug helper', panelAuth.includes("buildSecurePublicSlug(input.galleryName, 'galeri')")],
  ['panel settings enforces secure showroom slug on update', panelSettingsRoute.includes("ensureSecurePublicSlug(parsed.data.slug, 'galeri')")],
  ['public showroom resolves by slug only', publicShowroom.includes('slug: `eq.${normalized}`') && !publicShowroom.includes('id: `eq.${normalized}`')],
  ['public showroom rejects insecure route params before lookup', publicShowroom.includes("import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'") && publicShowroom.includes('if (!hasSecurePublicRouteToken(normalized)) return null')],
  ['panel settings displays real showroom route prefix', panelSettingsPage.includes('cebindegaleri.com/showroom/')],
  ['public vehicle events accept route token', vehicleEventsRoute.includes('vehicleRouteId') && !vehicleEventsRoute.includes('z.string().uuid')],
  ['public vehicle events reject insecure route token', vehicleEventsRoute.includes('refine(hasSecurePublicRouteToken') && vehicleEventsRoute.includes('MAX_PUBLIC_ROUTE_SLUG_LENGTH')],
  ['public client sends route token for events', publicVehicleClient.includes('vehicleRouteId: vehicle.routeId') && !publicVehicleClient.includes('vehicleId: vehicle.stockId')],
  ['public client sends route token for leads', publicVehicleClient.includes('vehicleId: vehicle.routeId')],
  ['lead resolver no longer accepts uuid lookup', !panelRepository.includes('function isUuidLike') && !panelRepository.includes('id: `eq.${normalized}`')],
  ['lead resolver rejects insecure public route params', panelRepository.includes('if (!hasSecurePublicRouteToken(normalized)) return null')],
  ['qr flow smoke uses route token', qrFlow.includes('vehicleRouteId: target.routeId')],
  ['demo page no longer links to fake short public object routes', !demoPage.includes('/showroom/demo-galeri') && !demoPage.includes('/arac/demo-arac')],
  ['predeploy checks public url hardening', predeploy.includes('guard.public_vehicle_secure_route_token')],
  ['predeploy checks showroom url hardening', predeploy.includes('guard.public_showroom_secure_route_token')],
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
