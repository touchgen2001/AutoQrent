import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { getClientIp } from '@/lib/security/request-guards'
import { panelAuthErrorResponse, requirePanelPermissionOrThrow, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { listPanelCustomerTasks } from '@/lib/server/customer-task-repository'

export const runtime = 'nodejs'

const createSchema = z.object({
  type: z.enum(['appointment', 'post_sale']),
  title: z.string().trim().min(2).max(120),
  scheduledAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(7).max(40),
  leadId: z.string().trim().max(120).optional(),
  vehicleId: z.string().trim().max(120).optional(),
  vehicleTitle: z.string().trim().max(180).optional(),
  note: z.string().trim().max(1000).optional(),
})

const updateSchema = z.object({
  id: z.string().trim().min(1).max(120),
  status: z.enum(['open', 'completed', 'cancelled']),
})

export async function GET(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'leads.manage')
    const items = await listPanelCustomerTasks(session.galleryId)
    return NextResponse.json({ ok: true, source: 'supabase', items })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Takvim ve takip kayıtları alınamadı.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const parsed = createSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Geçersiz takip kaydı.' }, { status: 400 })
    }
    const id = randomUUID()
    await insertAuditLog({
      action: 'customer_task_create',
      entityType: 'lead',
      entityId: id,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      metadata: { galleryId: session.galleryId, ...parsed.data, taskType: parsed.data.type },
    })
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Takip kaydı oluşturulamadı.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    await requirePanelPermissionOrThrow(session, 'leads.manage')
    const parsed = updateSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: 'Geçersiz durum güncellemesi.' }, { status: 400 })
    }
    await insertAuditLog({
      action: 'customer_task_status_change',
      entityType: 'lead',
      entityId: parsed.data.id,
      actorEmail: session.email,
      actorRole: session.role,
      source: 'panel_api',
      ip: getClientIp(request),
      userAgent: request.headers.get('user-agent') ?? 'unknown',
      metadata: { galleryId: session.galleryId, status: parsed.data.status },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Takip durumu güncellenemedi.' }, { status: 500 })
  }
}
