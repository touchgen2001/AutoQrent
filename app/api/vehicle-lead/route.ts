import { NextResponse } from 'next/server'
import { z } from 'zod'

import { isDemoVehicleRouteId } from '@/lib/demo-public-experience'
import { insertAuditLog } from '@/lib/security/audit'
import { recordApiError, recordApiTiming, recordOperationalEvent } from '@/lib/security/ops-monitor'
import { hasSecurePublicRouteToken, MAX_PUBLIC_ROUTE_SLUG_LENGTH } from '@/lib/security/public-route-token'
import { checkRateLimit, estimateBotRisk, getClientIp, trustedMutationOriginResponse } from '@/lib/security/request-guards'
import { insertContactLead } from '@/lib/server/panel-repository'
import { sendLeadPushToGallery } from '@/lib/server/web-push'

export const runtime = 'nodejs'

const vehicleLeadSchema = z
  .object({
    name: z.string().trim().min(2, 'Ad soyad en az 2 karakter olmalıdır.').max(100, 'Ad soyad çok uzun.'),
    phone: z.string().trim().max(30, 'Telefon bilgisi çok uzun.').optional(),
    email: z
      .string()
      .trim()
      .email('Geçerli bir e-posta adresi girin.')
      .max(150, 'E-posta çok uzun.')
      .optional()
      .or(z.literal('')),
    message: z.string().trim().max(3000, 'Mesaj çok uzun.').optional(),
    vehicleId: z
      .string()
      .trim()
      .min(1, 'Araç bilgisi eksik.')
      .max(MAX_PUBLIC_ROUTE_SLUG_LENGTH, 'Araç kimliği geçersiz.')
      .refine(hasSecurePublicRouteToken, 'Araç kimliği geçersiz.'),
    vehicleTitle: z.string().trim().min(2, 'Araç başlığı geçersiz.').max(200, 'Araç başlığı çok uzun.'),
    galleryWhatsapp: z.string().trim().max(30).optional(),
    source: z.enum(['qr', 'showroom', 'direct']).default('direct'),
    referrerSlug: z
      .string()
      .trim()
      .max(MAX_PUBLIC_ROUTE_SLUG_LENGTH, 'Galeri linki geçersiz.')
      .refine((value) => !value || hasSecurePublicRouteToken(value), 'Galeri linki geçersiz.')
      .optional(),
    website: z.string().trim().max(120).optional(),
    formStartedAt: z.coerce.number().int().positive().optional(),
  })
  .refine((data) => Boolean((data.phone || '').trim() || (data.email || '').trim()), {
    message: 'Telefon veya e-posta alanından en az birini doldurun.',
    path: ['phone'],
  })

const VEHICLE_LEAD_ROUTE = '/api/vehicle-lead'

function recordVehicleLeadOutcome(input: {
  status: number
  ok: boolean
  message: string
  startedAt: number
}) {
  recordOperationalEvent({
    area: 'lead',
    route: VEHICLE_LEAD_ROUTE,
    method: 'POST',
    status: input.status,
    ok: input.ok,
    message: input.message,
    durationMs: Date.now() - input.startedAt,
  })
  if (!input.ok || input.status >= 500) {
    recordApiError({
      area: 'lead',
      route: VEHICLE_LEAD_ROUTE,
      method: 'POST',
      status: input.status,
      message: input.message,
    })
  }
  recordApiTiming({
    area: 'lead',
    route: VEHICLE_LEAD_ROUTE,
    method: 'POST',
    status: input.status,
    durationMs: Date.now() - input.startedAt,
  })
}

function normalizePhoneNumber(rawPhone: string | undefined) {
  if (!rawPhone) return ''

  const digits = rawPhone.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('90')) return digits
  if (digits.startsWith('0')) return `9${digits}`
  return `90${digits}`
}

function normalizeReferrerSlug(value: string | undefined) {
  if (!value) return undefined

  const normalized = value.trim().toLowerCase()
  if (!hasSecurePublicRouteToken(normalized)) return undefined
  return normalized || undefined
}

function getVehicleLeadSourceLabel(source: 'qr' | 'showroom' | 'direct', referrerSlug?: string) {
  if (source === 'qr') return 'Kaynak: QR araç etiketi'
  if (source === 'showroom') return referrerSlug ? `Kaynak: showroom/${referrerSlug}` : 'Kaynak: showroom'
  return 'Kaynak: doğrudan araç linki'
}

function buildVehicleLeadMessage(input: {
  leadId: string
  name: string
  phone?: string
  email?: string
  vehicleTitle: string
  message: string
}) {
  return [
    'Yeni Araç Sayfası Lead',
    `Lead ID: ${input.leadId}`,
    `Araç: ${input.vehicleTitle}`,
    `Ad Soyad: ${input.name}`,
    `Telefon: ${input.phone || '-'}`,
    `E-posta: ${input.email || '-'}`,
    `Mesaj: ${input.message}`,
  ].join('\n')
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const blockedOrigin = trustedMutationOriginResponse(request)
  if (blockedOrigin) return blockedOrigin

  try {
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent') ?? 'unknown'
    const rateLimit = await checkRateLimit({
      key: `vehicle-lead:${clientIp}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      recordVehicleLeadOutcome({
        status: 429,
        ok: false,
        message: 'rate_limited',
        startedAt,
      })
      return NextResponse.json(
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
    }

    const body = await request.json()
    const parsed = vehicleLeadSchema.safeParse(body)

    if (!parsed.success) {
      recordVehicleLeadOutcome({
        status: 400,
        ok: false,
        message: parsed.error.issues[0]?.message ?? 'invalid_payload',
        startedAt,
      })
      return NextResponse.json(
        {
          ok: false,
          message: parsed.error.issues[0]?.message ?? 'Form verisi geçersiz.',
        },
        { status: 400 },
      )
    }

    const referrerSlug = normalizeReferrerSlug(parsed.data.referrerSlug)
    const formOpenDurationMs = parsed.data.formStartedAt ? Date.now() - parsed.data.formStartedAt : null

    if (isDemoVehicleRouteId(parsed.data.vehicleId)) {
      const response = NextResponse.json({
        ok: true,
        message: 'Demo talebiniz alındı. Bu kayıt gerçek panele yazılmaz.',
        fallbackWhatsAppUrl: null,
        demo: true,
      })
      recordVehicleLeadOutcome({
        status: 200,
        ok: true,
        message: 'demo_vehicle_lead_ok',
        startedAt,
      })
      return response
    }

    if (parsed.data.website) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `vehicle_lead_blocked_${Date.now()}`,
        source: 'vehicle_lead_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'honeypot',
          vehicleId: parsed.data.vehicleId,
          source: parsed.data.source,
          referrerSlug: referrerSlug || null,
        },
      })

      const response = NextResponse.json({
        ok: true,
        message: 'Talebiniz alındı.',
      })
      recordVehicleLeadOutcome({
        status: 200,
        ok: true,
        message: 'honeypot_blocked',
        startedAt,
      })
      return response
    }

    if (formOpenDurationMs !== null && formOpenDurationMs < 2000) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `vehicle_lead_blocked_${Date.now()}`,
        source: 'vehicle_lead_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'too_fast_submit',
          formOpenDurationMs,
          vehicleId: parsed.data.vehicleId,
          source: parsed.data.source,
          referrerSlug: referrerSlug || null,
        },
      })

      recordVehicleLeadOutcome({
        status: 429,
        ok: false,
        message: 'too_fast_submit',
        startedAt,
      })
      return NextResponse.json(
        {
          ok: false,
          message: 'Form çok hızlı gönderildi. Lütfen tekrar deneyin.',
        },
        { status: 429 },
      )
    }

    const botRisk = estimateBotRisk(request, [
      parsed.data.name,
      parsed.data.phone || '',
      parsed.data.email || '',
      parsed.data.vehicleTitle,
      parsed.data.message || '',
    ])

    if (botRisk.blocked) {
      await insertAuditLog({
        action: 'contact_form_blocked',
        entityType: 'contact',
        entityId: `vehicle_lead_blocked_${Date.now()}`,
        source: 'vehicle_lead_api',
        ip: clientIp,
        userAgent,
        metadata: {
          reason: 'bot_risk',
          botScore: botRisk.score,
          botReasons: botRisk.reasons,
          vehicleId: parsed.data.vehicleId,
          source: parsed.data.source,
          referrerSlug: referrerSlug || null,
        },
      })

      recordVehicleLeadOutcome({
        status: 403,
        ok: false,
        message: 'bot_risk_blocked',
        startedAt,
      })
      return NextResponse.json(
        {
          ok: false,
          message: 'İstek güvenlik nedeniyle engellendi.',
        },
        { status: 403 },
      )
    }

    const leadId = `vehicle_lead_${Date.now()}`
    const phone = parsed.data.phone?.trim() || ''
    const email = parsed.data.email?.trim() || undefined
    const message = parsed.data.message?.trim() || `${parsed.data.vehicleTitle} aracı için bilgi almak istiyorum.`
    const fallbackWhatsapp = normalizePhoneNumber(parsed.data.galleryWhatsapp)
    const fallbackWhatsAppUrl = fallbackWhatsapp
      ? `https://wa.me/${fallbackWhatsapp}?text=${encodeURIComponent(
          buildVehicleLeadMessage({
            leadId,
            name: parsed.data.name,
            phone,
            email,
            vehicleTitle: parsed.data.vehicleTitle,
            message,
          }),
        )}`
      : null

    const subject = `${parsed.data.vehicleTitle} için bilgi talebi`
    const sourceNote = getVehicleLeadSourceLabel(parsed.data.source, referrerSlug)
    const vehicleNote = `Araç ID: ${parsed.data.vehicleId}`
    const panelLeadSource = parsed.data.source === 'qr' ? 'qr' : parsed.data.source === 'showroom' ? 'showroom' : 'form'

    const panelLeadResult = await insertContactLead({
      leadExternalId: leadId,
      customerName: parsed.data.name,
      customerPhone: phone,
      customerEmail: email,
      subject,
      message,
      extraNotes: [sourceNote, vehicleNote],
      vehicleId: parsed.data.vehicleId,
      gallerySlug: referrerSlug,
      source: panelLeadSource,
    }).catch((panelLeadError) => {
      recordVehicleLeadOutcome({
        status: 502,
        ok: false,
        message: panelLeadError instanceof Error ? panelLeadError.message : 'panel_lead_insert_failed',
        startedAt,
      })
      return { stored: false, galleryId: null, vehicleId: null }
    })

    await insertAuditLog({
      action: 'contact_form_submit',
      entityType: 'lead',
      entityId: leadId,
      source: 'vehicle_lead_api',
      ip: clientIp,
      userAgent,
      metadata: {
        vehicleId: parsed.data.vehicleId,
        vehicleTitle: parsed.data.vehicleTitle,
        hasPhone: Boolean(phone),
        hasEmail: Boolean(email),
        source: parsed.data.source,
        referrerSlug: referrerSlug || null,
        leadStoredInPanel: panelLeadResult.stored,
        galleryId: panelLeadResult.galleryId,
        panelVehicleId: panelLeadResult.vehicleId,
      },
    })

    // Out-of-app alert: ping the dealer's registered devices (Web Push) so a
    // closed panel never means a missed lead. Best-effort — wrapped so a push
    // failure can never break the customer's submission.
    if (panelLeadResult.stored && panelLeadResult.galleryId) {
      await sendLeadPushToGallery(panelLeadResult.galleryId, {
        title: `Yeni talep · ${parsed.data.vehicleTitle}`,
        body: phone ? `${parsed.data.name} — ${phone}` : parsed.data.name,
        url: '/panel/leadler',
      }).catch(() => {})
    }

    const response = NextResponse.json({
      ok: true,
      message: 'Talebiniz alındı. En kısa sürede size ulaşacağız.',
      fallbackWhatsAppUrl,
    })
    recordVehicleLeadOutcome({
      status: 200,
      ok: true,
      message: 'vehicle_lead_ok',
      startedAt,
    })
    return response
  } catch (error) {
    console.error('[vehicle-lead-api]', error)
    recordVehicleLeadOutcome({
      status: 500,
      ok: false,
      message: error instanceof Error ? error.message : 'unexpected_vehicle_lead_error',
      startedAt,
    })
    return NextResponse.json(
      {
        ok: false,
        message: 'Beklenmeyen bir hata oluştu.',
      },
      { status: 500 },
    )
  }
}
