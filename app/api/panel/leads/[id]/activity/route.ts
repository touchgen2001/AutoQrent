import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { PanelLeadActivity } from '@/lib/panel-types'
import { listAuditLogs } from '@/lib/server/audit-repository'
import { panelAuthErrorResponse, requirePanelSessionOrThrow } from '@/lib/server/panel-auth-guard'
import { listPanelLeads } from '@/lib/server/panel-repository'
import { listLeadInteractions } from '@/lib/server/panel-operations-repository'

export const runtime = 'nodejs'

const paramsSchema = z.object({
  id: z.string().trim().min(1),
})

const statusLabels: Record<string, string> = {
  yeni: 'Yeni',
  arandi: 'Arandı',
  gorusuluyor: 'Görüşülüyor',
  'test-surusu': 'Test Sürüşü',
  'satisa-dondu': 'Satışa Döndü',
  kayip: 'Kayıp',
}

function activityFromAudit(log: Awaited<ReturnType<typeof listAuditLogs>>['items'][number]): PanelLeadActivity | null {
  if (log.action === 'lead_status_change') {
    const status = typeof log.metadata.to === 'string' ? log.metadata.to : ''
    return {
      id: `audit-${log.id}`,
      type: 'status_change',
      title: 'Durum güncellendi',
      description: statusLabels[status] || status || 'Yeni durum kaydedildi',
      createdAt: log.createdAt,
    }
  }

  if (log.action === 'lead_note_add') {
    return {
      id: `audit-${log.id}`,
      type: 'note_add',
      title: 'Not eklendi',
      description: 'Müşteri görüşmesine yeni bir not eklendi.',
      createdAt: log.createdAt,
    }
  }

  if (log.action === 'lead_follow_up_change') {
    const followUpDate = typeof log.metadata.followUpDate === 'string' ? log.metadata.followUpDate : null
    return {
      id: `audit-${log.id}`,
      type: 'follow_up_change',
      title: followUpDate ? 'Takip tarihi planlandı' : 'Takip tarihi kaldırıldı',
      description: followUpDate
        ? new Date(`${followUpDate}T00:00:00`).toLocaleDateString('tr-TR')
        : 'Planlı takip tarihi temizlendi.',
      createdAt: log.createdAt,
    }
  }

  return null
}

export async function GET(request: Request, context: { params: Promise<unknown> }) {
  try {
    const session = await requirePanelSessionOrThrow(request)
    const parsedParams = paramsSchema.safeParse(await context.params)
    if (!parsedParams.success) {
      return NextResponse.json({ ok: false, message: 'Geçersiz müşteri talebi kimliği.' }, { status: 400 })
    }

    const leads = await listPanelLeads(session.email)
    const lead = leads.items.find((item) => item.id === parsedParams.data.id)
    if (!lead) {
      return NextResponse.json({ ok: false, message: 'Müşteri talebi bulunamadı.' }, { status: 404 })
    }

    const [logs, interactions] = await Promise.all([
      listAuditLogs({
        galleryId: session.galleryId,
        entityId: lead.id,
        entityType: 'lead',
        limit: 100,
      }),
      listLeadInteractions({ galleryId: session.galleryId, leadId: lead.id }).catch(() => []),
    ])

    const createdActivity: PanelLeadActivity = {
      id: `created-${lead.id}`,
      type: 'created',
      title: 'Müşteri talebi oluşturuldu',
      description: lead.vehicleTitle || 'Genel müşteri talebi',
      createdAt: lead.createdAt,
    }
    const items: PanelLeadActivity[] = [
      ...logs.items.map(activityFromAudit).filter((item): item is PanelLeadActivity => Boolean(item)),
      ...interactions.map((interaction): PanelLeadActivity => ({
        id: `interaction-${interaction.id}`,
        type: 'whatsapp',
        title: interaction.channel === 'whatsapp' ? 'WhatsApp görüşmesi kaydedildi' : 'Müşteri teması kaydedildi',
        description: interaction.messagePreview || interaction.templateKey || interaction.channel,
        createdAt: interaction.createdAt,
      })),
      createdActivity,
    ].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    const authErrorResponse = panelAuthErrorResponse(error)
    if (authErrorResponse) return authErrorResponse
    return NextResponse.json({ ok: false, message: 'Müşteri aktivitesi alınamadı.' }, { status: 500 })
  }
}
