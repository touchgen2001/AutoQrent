import { NextResponse } from 'next/server'

import { galleryInitials } from '@/lib/gallery-monogram'
import { formatTrPhoneDisplay } from '@/lib/phone-display'
import {
  getPanelGalleryShowroomSummary,
  listPanelQrVehicleSummaries,
  listRecentPanelQrScans,
} from '@/lib/server/panel-repository'
import { getSocialImageShareCount, getTopSharedVehicles } from '@/lib/server/social-share-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const [vehicles, recentScans, gallery, topShared, shareCount] = await Promise.all([
      listPanelQrVehicleSummaries(session.email),
      listRecentPanelQrScans(40, session.email),
      getPanelGalleryShowroomSummary(session.email),
      getTopSharedVehicles(session.email).catch(() => []),
      getSocialImageShareCount(session.email).catch(() => 0),
    ])

    return NextResponse.json({
      ok: true,
      source: 'supabase',
      vehicles: vehicles.items,
      recentScans: recentScans.items,
      topShared,
      shareCount,
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
        message: 'QR verileri alınamadı.',
      },
      { status: 500 },
    )
  }
}
