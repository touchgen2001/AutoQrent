import { NextResponse } from 'next/server'
import { z } from 'zod'
import { listAuditLogs } from '@/lib/server/audit-repository'
import { panelAuthErrorResponse, requirePanelPermissionOrThrow, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'

export const runtime = 'nodejs'

const querySchema = z.object({
  search: z.string().trim().max(100).optional(),
  action: z
    .enum([
      'vehicle_create',
      'vehicle_delete',
      'vehicle_update',
      'lead_status_change',
      'lead_note_add',
      'lead_follow_up_change',
      'lead_whatsapp_open',
      'reservation_create',
      'reservation_update',
      'review_moderate',
      'vehicle_restore',
      'customer_task_create',
      'customer_task_status_change',
      'contact_form_submit',
      'contact_form_blocked',
      'public_vehicle_cta_click',
      'public_showroom_cta_click',
      'image_upload',
      'image_delete',
      'image_reject',
      'landing_cta_impression',
      'landing_cta_click',
      'landing_cta_config_update',
      'public_slug_rotation',
      'admin_user_delete',
      'admin_user_authorization_update',
      'admin_user_status_update',
      'admin_user_email_verify',
      'admin_user_password_reset',
      'admin_moderation_action',
      'admin_subscription_update',
      'admin_notification_send',
    ])
    .optional(),
  entityType: z.enum(['vehicle', 'lead', 'contact', 'system', 'marketing', 'user', 'subscription', 'notification', 'moderation', 'reservation', 'review']).optional(),
  source: z.string().trim().max(80).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'audit.view')

    const url = new URL(request.url)
    const parsed = querySchema.safeParse({
      search: url.searchParams.get('search') || undefined,
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      source: url.searchParams.get('source') || undefined,
      from: url.searchParams.get('from') || undefined,
      to: url.searchParams.get('to') || undefined,
      limit: url.searchParams.get('limit') || undefined,
      offset: url.searchParams.get('offset') || undefined,
    })

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Geçersiz filtre parametreleri.',
        },
        { status: 400 },
      )
    }

    const result = await listAuditLogs({
      ...parsed.data,
      galleryId: session.galleryId,
    })

    return NextResponse.json({
      ok: true,
      source: result.source,
      items: result.items,
    })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse

    return NextResponse.json(
      {
        ok: false,
        message: 'Denetim kaydı listesi alınamadı.',
      },
      { status: 500 },
    )
  }
}
