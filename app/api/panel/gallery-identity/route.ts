import { NextResponse } from 'next/server'

import { galleryInitials } from '@/lib/gallery-monogram'
import { formatTrPhoneDisplay } from '@/lib/phone-display'
import { getPanelGalleryShowroomSummary } from '@/lib/server/panel-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

// Lightweight gallery identity for the social-image dialog on pages that don't
// already load the gallery (vehicle list + edit). Mirrors the `gallery` shape
// returned by /api/panel/qr-codes so the same SocialImageGallery type applies.
export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const gallery = await getPanelGalleryShowroomSummary(session.email)

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      gallery: gallery
        ? {
            name: gallery.name,
            logo: gallery.logo,
            monogram: galleryInitials(gallery.name),
            showroomUrl: gallery.publicShowroomUrl,
            phone: formatTrPhoneDisplay(gallery.phone),
            city: gallery.city,
            heroTagline: gallery.heroTagline,
            vehicleCount: gallery.vehicleCount,
          }
        : null,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Galeri bilgisi alınamadı.',
      },
      { status: 500 },
    )
  }
}
