import { NextResponse } from 'next/server'
import { z } from 'zod'
import { insertAuditLog } from '@/lib/security/audit'
import { getSecurityLimits } from '@/lib/security/limits'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { checkRateLimit, estimateBotRisk, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { insertContactLead } from '@/lib/server/panel-repository'

export const runtime = 'nodejs'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.').max(100, 'Ad soyad çok uzun.'),
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  phone: z.string().trim().max(30, 'Telefon bilgisi çok uzun.').optional(),
  galleryName: z.string().trim().min(2, 'Galeri adı en az 2 karakter olmalıdır.').max(150, 'Galeri adı çok uzun.'),
  vehicleCount: z.enum(['1-15', '16-50', '51-100', '101-200', '200+']),
  currentManagement: z.enum(['excel-whatsapp', 'ilan-platformlari', 'baska-yazilim', 'manuel', 'sistem-yok']),
  subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalıdır.').max(150, 'Konu çok uzun.'),
  message: z.string().trim().min(10, 'Mesaj en az 10 karakter olmalıdır.').max(3000, 'Mesaj çok uzun.'),
  website: z.string().trim().max(120).optional(),
  gallerySlug: z.string().trim().max(120).optional(),
  formStartedAt: z.coerce.number().int().positive().optional(),
})

type DeliveryChannel = 'crm_webhook' | 'whatsapp_webhook'

type DeliveryResult = {
  channel: DeliveryChannel
  ok: boolean
  status: number
  detail: string
}

type ContactSubmission = z.infer<typeof contactSchema> & {
  leadId: string
  sentAt: string
  ip: string
  userAgent: string
}

function normalizePhoneNumber(rawPhone: string | undefined) {
  if (!rawPhone) return ''
  const digits = rawPhone.replace(/\D/g, '')
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function buildLeadMessage(submission: ContactSubmission) {
  return [
    'Yeni Web Lead',
    `Lead ID: ${submission.leadId}`,
    `Ad Soyad: ${submission.name}`,
    `E-posta: ${submission.email}`,
    `Telefon: ${submission.phone || '-'}`,
    `Galeri: ${submission.galleryName}`,
    `Aktif Araç Sayısı: ${submission.vehicleCount}`,
    `Mevcut Yönetim: ${submission.currentManagement}`,
    `Konu: ${submission.subject}`,
    `Mesaj: ${submission.message}`,
    `Tarih: ${submission.sentAt}`,
  ].join('\n')
}

async function postJson(
  url: string,
  payload: Record<string, unknown>,
  authToken?: string,
) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  const limits = getSecurityLimits()
  try {
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const rateLimit = await checkRateLimit({
      key: `contact:${clientIp}`,
      limit: limits.contact.limit,
      windowMs: limits.contact.windowMs,
    })

    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          ok: false,
          message: 'Çok sık deneme yapıldı. Lütfen kısa bir süre sonra tekrar deneyin.',
        },
        {
          status: 429,
          headers: {
            'retry-after': String(rateLimit.retryAfterSeconds),
          },
        },
      )
      recordApiTiming({
        route: '/api/contact',
        method: 'POST',
        status: 429,
        durationMs: Date.now() - startedAt,
      })
      return response
    }

    const body = await request.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      const response = NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Form verisi geçersiz.',
        },
        { status: 400 },
      )
      recordApiTiming({
        route: '/api/contact',
        method: 'POST',
        status: 400,
        durationMs: Date.now() - startedAt,
      })
      return response
    }

    const formOpenDurationMs = parsed.data.formStartedAt ? Date.now() - parsed.data.formStartedAt : null

    if (parsed.data.website) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `blocked_${Date.now()}`,
        source: 'contact_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'honeypot',
          gallerySlug: parsed.data.gallerySlug || null,
        },
      })

      return NextResponse.json({
        ok: true,
        message: 'Mesajınız alındı.',
      })
    }

    if (formOpenDurationMs !== null && formOpenDurationMs < 2500) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `blocked_${Date.now()}`,
        source: 'contact_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'too_fast_submit',
          formOpenDurationMs,
          gallerySlug: parsed.data.gallerySlug || null,
        },
      })

      const response = NextResponse.json(
        {
          ok: false,
          message: 'Form çok hızlı gönderildi. Lütfen alanları kontrol edip tekrar deneyin.',
        },
        { status: 429 },
      )
      recordApiTiming({
        route: '/api/contact',
        method: 'POST',
        status: 429,
        durationMs: Date.now() - startedAt,
      })
      return response
    }

    const botRisk = estimateBotRisk(request, [
      parsed.data.name,
      parsed.data.email,
      parsed.data.galleryName,
      parsed.data.subject,
      parsed.data.message,
    ])

    if (botRisk.blocked) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `blocked_${Date.now()}`,
        source: 'contact_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'bot_risk',
          botScore: botRisk.score,
          botReasons: botRisk.reasons,
          gallerySlug: parsed.data.gallerySlug || null,
        },
      })

      const response = NextResponse.json(
        {
          ok: false,
          message: 'İsteğiniz güvenlik nedeniyle engellendi.',
        },
        { status: 403 },
      )
      recordApiTiming({
        route: '/api/contact',
        method: 'POST',
        status: 403,
        durationMs: Date.now() - startedAt,
      })
      return response
    }

    const leadId = `lead_${Date.now()}`

    const submission: ContactSubmission = {
      leadId,
      ...parsed.data,
      website: undefined,
      formStartedAt: undefined,
      phone: parsed.data.phone || undefined,
      sentAt: new Date().toISOString(),
      ip: clientIp,
      userAgent,
    }

    let panelLeadResult: { stored: boolean; galleryId: string | null; vehicleId: string | null } = {
      stored: false,
      galleryId: null,
      vehicleId: null,
    }
    try {
      panelLeadResult = await insertContactLead({
        leadExternalId: submission.leadId,
        customerName: submission.name,
        customerPhone: submission.phone,
        customerEmail: submission.email,
        subject: submission.subject,
        message: [
          `Galeri: ${submission.galleryName}`,
          `Aktif araç sayısı: ${submission.vehicleCount}`,
          `Mevcut yönetim: ${submission.currentManagement}`,
          '',
          submission.message,
        ].join('\n'),
        gallerySlug: parsed.data.gallerySlug,
        source: 'form',
      })
    } catch (panelLeadError) {
      console.error('[contact-lead][panel-insert-failed]', panelLeadError)
      recordOperationalEvent({
        area: 'contact',
        route: '/api/contact',
        method: 'POST',
        status: 502,
        ok: false,
        message: panelLeadError instanceof Error ? panelLeadError.message : 'panel_lead_insert_failed',
        durationMs: Date.now() - startedAt,
      })
    }
    const leadStoredInPanel = panelLeadResult.stored

    const results: DeliveryResult[] = []
    const crmWebhookUrl = process.env.CONTACT_CRM_WEBHOOK_URL || process.env.CONTACT_WEBHOOK_URL
    const crmWebhookToken = process.env.CONTACT_CRM_WEBHOOK_TOKEN
    const whatsappWebhookUrl = process.env.CONTACT_WHATSAPP_WEBHOOK_URL
    const whatsappWebhookToken = process.env.CONTACT_WHATSAPP_WEBHOOK_TOKEN

    const fallbackWhatsAppNumber = normalizePhoneNumber(
      process.env.WHATSAPP_ALERT_NUMBER || '05309738240',
    )
    const fallbackWhatsAppUrl = fallbackWhatsAppNumber
      ? `https://wa.me/${fallbackWhatsAppNumber}?text=${encodeURIComponent(buildLeadMessage(submission))}`
      : null

    if (crmWebhookUrl) {
      try {
        const crmResponse = await postJson(
          crmWebhookUrl,
          {
            source: 'website-contact-form',
            lead: submission,
          },
          crmWebhookToken,
        )

        results.push({
          channel: 'crm_webhook',
          ok: crmResponse.ok,
          status: crmResponse.status,
          detail: crmResponse.ok ? 'Lead CRM webhook kanalına iletildi.' : 'CRM webhook isteği hata döndürdü.',
        })
      } catch {
        results.push({
          channel: 'crm_webhook',
          ok: false,
          status: 0,
          detail: 'CRM webhook kanalına erişim başarısız oldu.',
        })
      }
    }

    if (whatsappWebhookUrl) {
      try {
        const whatsappResponse = await postJson(
          whatsappWebhookUrl,
          {
            source: 'website-contact-form',
            lead: submission,
            message: buildLeadMessage(submission),
            fallbackWhatsAppUrl,
          },
          whatsappWebhookToken,
        )

        results.push({
          channel: 'whatsapp_webhook',
          ok: whatsappResponse.ok,
          status: whatsappResponse.status,
          detail: whatsappResponse.ok
            ? 'WhatsApp webhook kanalına bildirim iletildi.'
            : 'WhatsApp webhook isteği hata döndürdü.',
        })
      } catch {
        results.push({
          channel: 'whatsapp_webhook',
          ok: false,
          status: 0,
          detail: 'WhatsApp webhook kanalına erişim başarısız oldu.',
        })
      }
    }

    // Always keep a server-side trace so no incoming lead is silently lost.
    console.info('[contact-lead]', {
      leadId: submission.leadId,
      email: submission.email,
      subject: submission.subject,
      channelsConfigured: {
        crmWebhook: Boolean(crmWebhookUrl),
        whatsappWebhook: Boolean(whatsappWebhookUrl),
      },
      deliveryResults: results,
    })

    const deliveredCount = results.filter((item) => item.ok).length
    const totalTargets = results.length

    if (totalTargets > 0 && deliveredCount === 0) {
      await insertAuditLog({
        action: 'contact_form_submit',
        entityType: 'contact',
        entityId: submission.leadId,
        source: 'contact_api',
        ip: submission.ip,
        userAgent: submission.userAgent,
      metadata: {
        deliveredCount,
        totalTargets,
        status: 'delivery_failed',
        leadStoredInPanel,
        gallerySlug: parsed.data.gallerySlug || null,
        galleryName: parsed.data.galleryName,
        vehicleCount: parsed.data.vehicleCount,
        currentManagement: parsed.data.currentManagement,
        galleryId: panelLeadResult.galleryId,
        vehicleId: panelLeadResult.vehicleId,
      },
    })

      const response = NextResponse.json(
        {
          ok: false,
          message:
            'Lead kaydı alındı ancak CRM/WhatsApp yönlendirmelerinde hata oluştu. Lütfen WhatsApp üzerinden manuel takip edin.',
          leadId: submission.leadId,
          fallbackWhatsAppUrl,
          delivery: results,
        },
        { status: 502 },
      )
      recordApiError({
        route: '/api/contact',
        method: 'POST',
        status: 502,
        message: 'delivery_failed',
        area: 'contact',
      })
      recordOperationalEvent({
        area: 'contact',
        route: '/api/contact',
        method: 'POST',
        status: 502,
        ok: false,
        message: 'delivery_failed',
        durationMs: Date.now() - startedAt,
      })
      recordApiTiming({
        route: '/api/contact',
        method: 'POST',
        status: 502,
        durationMs: Date.now() - startedAt,
        area: 'contact',
      })
      return response
    }

    const successMessage =
      totalTargets === 0
        ? 'Mesajınız alındı. CRM/WhatsApp entegrasyonu henüz yapılandırılmadığı için manuel takip bağlantısı oluşturuldu.'
        : 'Mesajınız başarıyla alındı ve lead kaydı ilgili kanallara iletildi.'

    await insertAuditLog({
      action: 'contact_form_submit',
      entityType: 'contact',
      entityId: submission.leadId,
      source: 'contact_api',
      ip: submission.ip,
      userAgent: submission.userAgent,
      metadata: {
        deliveredCount,
        totalTargets,
        status: 'ok',
        leadStoredInPanel,
        gallerySlug: parsed.data.gallerySlug || null,
        galleryName: parsed.data.galleryName,
        vehicleCount: parsed.data.vehicleCount,
        currentManagement: parsed.data.currentManagement,
        galleryId: panelLeadResult.galleryId,
        vehicleId: panelLeadResult.vehicleId,
      },
    })

    const response = NextResponse.json({
      ok: true,
      message: successMessage,
      leadId: submission.leadId,
      fallbackWhatsAppUrl,
      delivery: {
        totalTargets,
        deliveredCount,
        details: results,
      },
    })
    recordApiTiming({
      route: '/api/contact',
      method: 'POST',
      status: 200,
      durationMs: Date.now() - startedAt,
      area: 'contact',
    })
    return response
  } catch {
    const response = NextResponse.json(
      {
        ok: false,
        message: 'Mesaj gönderimi sırasında beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
    recordApiError({
      route: '/api/contact',
      method: 'POST',
      status: 500,
      message: 'unexpected_contact_error',
      area: 'contact',
    })
    recordOperationalEvent({
      area: 'contact',
      route: '/api/contact',
      method: 'POST',
      status: 500,
      ok: false,
      message: 'unexpected_contact_error',
      durationMs: Date.now() - startedAt,
    })
    recordApiTiming({
      route: '/api/contact',
      method: 'POST',
      status: 500,
      durationMs: Date.now() - startedAt,
      area: 'contact',
    })
    return response
  }
}
