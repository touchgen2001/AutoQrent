import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'

import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'
import {
  ImageUploadValidationError,
  validateImageFileForUpload,
  type SafeImageScan,
} from '@/lib/server/safe-image-upload'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const STORAGE_BUCKET = 'vehicle-images'

function getSupabaseUploadConfig() {
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

type GalleryUpdateRow = {
  id: string
  logo_url: string | null
}

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    requireSupabaseAdminConfig()
    const { url, serviceRoleKey } = getSupabaseUploadConfig()

    if (!session.galleryId) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Galeri kimliği bulunamadı.',
        },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Logo dosyası bulunamadı.',
        },
        { status: 400 },
      )
    }

    const validatedImage = await validateImageFileForUpload(file, {
      allowedKinds: ['jpeg', 'png', 'webp'],
      maxBytes: MAX_FILE_SIZE_BYTES,
      label: file.name || 'Logo',
    })

    const extension = validatedImage.extension
    const objectPath = `panel/gallery-logos/${session.galleryId}/logo-${Date.now()}-${randomUUID()}.${extension}`
    const uploadUrl = new URL(`${url}/storage/v1/object/${STORAGE_BUCKET}/${encodePathSegments(objectPath)}`)
    uploadUrl.searchParams.set('upsert', 'false')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'content-type': validatedImage.contentType,
        'x-upsert': 'false',
      },
      body: validatedImage.buffer,
      cache: 'no-store',
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      throw new Error(errorText || `Logo yüklenemedi: ${uploadResponse.status}`)
    }

    const publicUrl = `${url}/storage/v1/object/public/${STORAGE_BUCKET}/${encodePathSegments(objectPath)}`

    const updatedRows = await supabaseAdminFetch<GalleryUpdateRow[]>({
      method: 'PATCH',
      path: '/rest/v1/galleries',
      query: {
        id: `eq.${session.galleryId}`,
      },
      body: {
        logo_url: publicUrl,
      },
      prefer: 'return=representation',
    })

    const updatedRow = updatedRows[0]
    if (!updatedRow) {
      throw new Error('Galeri logo bilgisi güncellenemedi.')
    }

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      item: {
        path: objectPath,
        publicUrl,
        name: file.name,
        size: file.size,
        mimeType: validatedImage.contentType,
        securityScan: {
          kind: validatedImage.kind,
          contentType: validatedImage.contentType,
          extension: validatedImage.extension,
          width: validatedImage.width,
          height: validatedImage.height,
        } satisfies SafeImageScan,
      },
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    if (error instanceof ImageUploadValidationError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : 'Logo yüklenemedi.',
      },
      { status: 500 },
    )
  }
}
