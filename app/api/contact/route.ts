import { NextResponse } from 'next/server'
import { z } from 'zod'

export const runtime = 'nodejs'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.').max(100, 'Ad soyad çok uzun.'),
  email: z.string().trim().email('Geçerli bir e-posta adresi girin.'),
  phone: z.string().trim().max(30, 'Telefon bilgisi çok uzun.').optional(),
  subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalıdır.').max(150, 'Konu çok uzun.'),
  message: z.string().trim().min(10, 'Mesaj en az 10 karakter olmalıdır.').max(3000, 'Mesaj çok uzun.'),
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
  try {
    const body = await request.json()
    const parsed = contactSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Form verisi geçersiz.',
        },
        { status: 400 },
      )
    }

    const leadId = `lead_${Date.now()}`

    const submission: ContactSubmission = {
      leadId,
      ...parsed.data,
      phone: parsed.data.phone || undefined,
      sentAt: new Date().toISOString(),
      ip:
        request.headers.get('x-forwarded-for') ??
        request.headers.get('x-real-ip') ??
        'unknown',
      userAgent: request.headers.get('user-agent') ?? 'unknown',
    }

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
      return NextResponse.json(
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
    }

    const successMessage =
      totalTargets === 0
        ? 'Mesajınız alındı. CRM/WhatsApp entegrasyonu henüz yapılandırılmadığı için manuel takip bağlantısı oluşturuldu.'
        : 'Mesajınız başarıyla alındı ve lead kaydı ilgili kanallara iletildi.'

    return NextResponse.json({
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
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: 'Mesaj gönderimi sırasında beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
