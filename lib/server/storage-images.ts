import { recordOperationalEvent } from '@/lib/security/ops-monitor'

const VEHICLE_IMAGES_BUCKET = 'vehicle-images'

function getSupabaseStorageConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase admin yapılandırması eksik.')
  }

  return {
    url,
    serviceRoleKey,
  }
}

function encodePathSegments(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

export function getVehicleImagesBucket() {
  return VEHICLE_IMAGES_BUCKET
}

export function buildStoragePublicUrl(input: { baseUrl: string; bucket: string; objectPath: string }) {
  return `${input.baseUrl.replace(/\/$/, '')}/storage/v1/object/public/${input.bucket}/${encodePathSegments(input.objectPath)}`
}

export function objectPathFromStoragePublicUrl(publicUrl: string, bucket = VEHICLE_IMAGES_BUCKET) {
  try {
    const parsed = new URL(publicUrl)
    const marker = `/storage/v1/object/public/${bucket}/`
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null

    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

export function isGalleryVehicleImagePath(objectPath: string, galleryId: string) {
  return objectPath.startsWith(`panel/${galleryId}/vehicle-images/`)
}

function isLegacyOwnedVehicleImagePath(objectPath: string) {
  return objectPath.startsWith('panel/') && !objectPath.startsWith('panel/gallery-logos/')
}

export function normalizeGalleryVehicleImagePath(input: {
  path?: string | null
  publicUrl?: string | null
  galleryId: string
  allowOwnedLegacyPanelPaths?: boolean
}) {
  const rawPath = input.path?.trim() || (input.publicUrl ? objectPathFromStoragePublicUrl(input.publicUrl) : null)
  if (!rawPath) return null

  const normalizedPath = rawPath.replace(/^\/+/, '')
  if (!isGalleryVehicleImagePath(normalizedPath, input.galleryId)) {
    if (!input.allowOwnedLegacyPanelPaths || !isLegacyOwnedVehicleImagePath(normalizedPath)) {
      return null
    }
  }

  return normalizedPath
}

export async function deleteVehicleImageObjectsForGallery(input: {
  galleryId: string
  paths?: Array<string | null | undefined>
  publicUrls?: Array<string | null | undefined>
  allowOwnedLegacyPanelPaths?: boolean
}) {
  const normalizedPaths = new Set<string>()

  for (const path of input.paths || []) {
    const normalized = normalizeGalleryVehicleImagePath({
      path,
      galleryId: input.galleryId,
      allowOwnedLegacyPanelPaths: input.allowOwnedLegacyPanelPaths,
    })
    if (normalized) normalizedPaths.add(normalized)
  }

  for (const publicUrl of input.publicUrls || []) {
    const normalized = normalizeGalleryVehicleImagePath({
      publicUrl,
      galleryId: input.galleryId,
      allowOwnedLegacyPanelPaths: input.allowOwnedLegacyPanelPaths,
    })
    if (normalized) normalizedPaths.add(normalized)
  }

  const paths = [...normalizedPaths]
  if (paths.length === 0) {
    return {
      deleted: 0,
      paths: [] as string[],
    }
  }

  const { url, serviceRoleKey } = getSupabaseStorageConfig()
  const response = await fetch(`${url}/storage/v1/object/${VEHICLE_IMAGES_BUCKET}`, {
    method: 'DELETE',
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      prefixes: paths,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    recordOperationalEvent({
      area: 'storage_delete',
      route: 'supabase-storage',
      method: 'DELETE',
      status: response.status,
      ok: false,
      message: errorText || `Storage silme işlemi başarısız oldu: ${response.status}`,
      count: paths.length,
    })
    throw new Error(errorText || `Storage silme işlemi başarısız oldu: ${response.status}`)
  }

  recordOperationalEvent({
    area: 'storage_delete',
    route: 'supabase-storage',
    method: 'DELETE',
    status: 200,
    ok: true,
    message: 'storage_delete_ok',
    count: paths.length,
  })

  return {
    deleted: paths.length,
    paths,
  }
}
