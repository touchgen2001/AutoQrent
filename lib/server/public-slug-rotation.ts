import {
  buildSecurePublicSlug,
  hasSecurePublicRouteToken,
} from '@/lib/security/public-route-token'
import { supabaseAdminFetch } from '@/lib/server/supabase-admin'

type GallerySlugRow = {
  id: string
  name: string | null
  slug: string | null
}

type VehicleSlugRow = {
  id: string
  brand: string | null
  model: string | null
  year: number | null
  slug: string | null
}

type RotateTableInput<T> = {
  table: 'galleries' | 'vehicles'
  select: string
  fallback: string
  getBase: (row: T) => string
  dryRun: boolean
}

const ROTATION_PAGE_SIZE = 200

async function fetchAllRows<T>(table: string, select: string) {
  const rows: T[] = []

  while (true) {
    const page = await supabaseAdminFetch<T[]>({
      path: `/rest/v1/${table}`,
      query: {
        select,
        order: 'id.asc',
        limit: ROTATION_PAGE_SIZE,
        offset: rows.length,
      },
    })

    if (!Array.isArray(page) || page.length === 0) break
    rows.push(...page)
    if (page.length < ROTATION_PAGE_SIZE) break
  }

  return rows
}

async function updateSlug(table: string, id: string, slug: string) {
  await supabaseAdminFetch<unknown>({
    method: 'PATCH',
    path: `/rest/v1/${table}`,
    query: {
      id: `eq.${id}`,
    },
    body: {
      slug,
    },
    prefer: 'return=minimal',
  })
}

async function rotateTable<T extends { id: string }>(input: RotateTableInput<T>) {
  const rows = await fetchAllRows<T>(input.table, input.select)
  let rotated = 0

  for (const row of rows) {
    const nextSlug = buildSecurePublicSlug(input.getBase(row), input.fallback)
    if (!input.dryRun) {
      await updateSlug(input.table, row.id, nextSlug)
    }
    rotated += 1
  }

  return {
    table: input.table,
    rows: rows.length,
    rotated,
  }
}

function vehicleSlugBase(vehicle: VehicleSlugRow) {
  return `${vehicle.brand || 'arac'}-${vehicle.model || 'arac'}-${vehicle.year || ''}`
}

async function verifySecureSlugs() {
  const galleries = await fetchAllRows<Pick<GallerySlugRow, 'id' | 'slug'>>('galleries', 'id,slug')
  const vehicles = await fetchAllRows<Pick<VehicleSlugRow, 'id' | 'slug'>>('vehicles', 'id,slug')

  const insecureGalleryCount = galleries.filter((row) => !hasSecurePublicRouteToken(row.slug || '')).length
  const insecureVehicleCount = vehicles.filter((row) => !hasSecurePublicRouteToken(row.slug || '')).length

  if (insecureGalleryCount > 0 || insecureVehicleCount > 0) {
    throw new Error(`Güvensiz public slug kaldı. galleries=${insecureGalleryCount}, vehicles=${insecureVehicleCount}`)
  }

  return {
    galleries: galleries.length,
    vehicles: vehicles.length,
  }
}

export async function rotateExistingPublicRouteSlugs(input: { dryRun?: boolean } = {}) {
  const dryRun = Boolean(input.dryRun)
  const galleries = await rotateTable<GallerySlugRow>({
    table: 'galleries',
    select: 'id,name,slug',
    fallback: 'galeri',
    getBase: (gallery) => gallery.name || 'galeri',
    dryRun,
  })

  const vehicles = await rotateTable<VehicleSlugRow>({
    table: 'vehicles',
    select: 'id,brand,model,year,slug',
    fallback: 'arac',
    getBase: vehicleSlugBase,
    dryRun,
  })

  return {
    ok: true,
    dryRun,
    oldPublicLinksInvalidated: !dryRun,
    rotated: [galleries, vehicles],
    verification: dryRun ? null : await verifySecureSlugs(),
  }
}
