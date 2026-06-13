import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/seo'
import { hasSecurePublicRouteToken } from '@/lib/security/public-route-token'
import { hasSupabaseAdmin, supabaseAdminFetch } from '@/lib/server/supabase-admin'

type GallerySitemapRow = {
  slug: string | null
  created_at: string | null
}

type VehicleSitemapRow = {
  slug: string | null
  updated_at: string | null
  created_at: string | null
}

function toDate(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp) : fallback
}

function dedupeByUrl(entries: MetadataRoute.Sitemap) {
  const seen = new Set<string>()
  const unique: MetadataRoute.Sitemap = []

  for (const entry of entries) {
    if (seen.has(entry.url)) continue
    seen.add(entry.url)
    unique.push(entry)
  }

  return unique
}

export async function getPublicSitemapEntries(now = new Date()): Promise<MetadataRoute.Sitemap> {
  if (!hasSupabaseAdmin()) return []

  try {
    const [galleries, vehicles] = await Promise.all([
      supabaseAdminFetch<GallerySitemapRow[]>({
        path: '/rest/v1/galleries',
        query: {
          select: 'slug,created_at',
          order: 'created_at.desc',
          limit: 500,
        },
      }),
      supabaseAdminFetch<VehicleSitemapRow[]>({
        path: '/rest/v1/vehicles',
        query: {
          select: 'slug,updated_at,created_at',
          status: 'eq.active',
          deleted_at: 'is.null',
          order: 'updated_at.desc',
          limit: 1000,
        },
      }),
    ])

    const showroomEntries: MetadataRoute.Sitemap = galleries
      .filter((gallery) => gallery.slug && hasSecurePublicRouteToken(gallery.slug))
      .map((gallery) => ({
        url: absoluteUrl(`/showroom/${gallery.slug}`),
        lastModified: toDate(gallery.created_at, now),
        changeFrequency: 'weekly' as const,
        priority: 0.65,
      }))

    const vehicleEntries: MetadataRoute.Sitemap = vehicles
      .filter((vehicle) => vehicle.slug && hasSecurePublicRouteToken(vehicle.slug))
      .map((vehicle) => ({
        url: absoluteUrl(`/arac/${vehicle.slug}`),
        lastModified: toDate(vehicle.updated_at || vehicle.created_at, now),
        changeFrequency: 'daily' as const,
        priority: 0.72,
      }))

    return dedupeByUrl([...showroomEntries, ...vehicleEntries])
  } catch {
    return []
  }
}
