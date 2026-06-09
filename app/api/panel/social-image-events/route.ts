import { NextResponse } from 'next/server'
import { z } from 'zod'

import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { recordVehicleShareDownloads } from '@/lib/server/social-share-repository'

// Records dealer-initiated downloads of a vehicle's social share image so the QR
// panel can show an honest "en çok indirilen araç görselleri" card. Called
// best-effort from the share dialog (single) and the showroom ZIP export (zip);
// the client ignores failures so a tracking hiccup never blocks a download.
export const runtime = 'nodejs'

const payloadSchema = z.object({
  scope: z.enum(['single', 'zip']).optional(),
  kind: z.enum(['download', 'share']).optional(),
  format: z.string().trim().max(24).optional(),
  items: z
    .array(
      z.object({
        vehicleId: z.string().trim().min(1).max(120),
        vehicleTitle: z.string().trim().max(160).optional(),
      }),
    )
    .min(1)
    .max(250),
})

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)

    const body = await request.json().catch(() => null)
    const parsed = payloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz paylaşım olayı.' },
        { status: 400 },
      )
    }

    const result = await recordVehicleShareDownloads({
      ownerEmail: session.email,
      items: parsed.data.items,
      format: parsed.data.format,
      scope: parsed.data.scope,
      kind: parsed.data.kind,
    })

    return NextResponse.json({ ok: true, recorded: result.recorded })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json({ ok: false, message: 'Paylaşım olayı kaydedilemedi.' }, { status: 500 })
  }
}
