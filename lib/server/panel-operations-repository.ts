import { getLeadAssignment } from '@/lib/lead-assignment'
import { listPanelLeads } from '@/lib/server/panel-repository'
import { fetchPanelTeamMembers } from '@/lib/server/panel-team-repository'
import { requireSupabaseAdminConfig, supabaseAdminFetch } from '@/lib/server/supabase-admin'

export type LeadInteraction = {
  id: string
  leadId: string
  actorEmail: string
  channel: 'whatsapp' | 'phone' | 'email' | 'note'
  direction: 'outbound' | 'inbound'
  templateKey: string | null
  messagePreview: string | null
  createdAt: string
}

export type VehicleReservationStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed'
export type VehicleReservationPaymentStatus = 'unpaid' | 'pending' | 'paid' | 'refunded'

export type VehicleReservation = {
  id: string
  galleryId: string
  vehicleId: string
  vehicleTitle: string
  customerName: string
  customerPhone: string
  customerEmail: string | null
  note: string | null
  status: VehicleReservationStatus
  depositAmount: number
  paymentStatus: VehicleReservationPaymentStatus
  handledByEmail: string | null
  createdAt: string
  updatedAt: string
}

export type GalleryReviewStatus = 'pending' | 'published' | 'rejected'

export type GalleryReview = {
  id: string
  galleryId: string
  customerName: string
  customerEmail: string | null
  rating: number
  comment: string
  status: GalleryReviewStatus
  moderatedByEmail: string | null
  createdAt: string
  updatedAt: string
}

type LeadInteractionRow = {
  id: string
  lead_id: string
  actor_email: string
  channel: LeadInteraction['channel']
  direction: LeadInteraction['direction']
  template_key: string | null
  message_preview: string | null
  created_at: string
}

type ReservationRow = {
  id: string
  gallery_id: string
  vehicle_id: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  note: string | null
  status: VehicleReservationStatus
  deposit_amount: number | string
  payment_status: VehicleReservationPaymentStatus
  handled_by_email: string | null
  created_at: string
  updated_at: string
}

type ReviewRow = {
  id: string
  gallery_id: string
  customer_name: string
  customer_email: string | null
  rating: number
  comment: string
  status: GalleryReviewStatus
  moderated_by_email: string | null
  created_at: string
  updated_at: string
}

function mapInteraction(row: LeadInteractionRow): LeadInteraction {
  return {
    id: row.id,
    leadId: row.lead_id,
    actorEmail: row.actor_email,
    channel: row.channel,
    direction: row.direction,
    templateKey: row.template_key,
    messagePreview: row.message_preview,
    createdAt: row.created_at,
  }
}

function mapReview(row: ReviewRow): GalleryReview {
  return {
    id: row.id,
    galleryId: row.gallery_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    rating: Number(row.rating),
    comment: row.comment,
    status: row.status,
    moderatedByEmail: row.moderated_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function fetchVehicleTitleMap(vehicleIds: string[]) {
  if (vehicleIds.length === 0) return new Map<string, string>()
  const rows = await supabaseAdminFetch<Array<{
    id: string
    brand: string
    model: string
    variant: string | null
    year: number
  }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,brand,model,variant,year',
      id: `in.(${vehicleIds.join(',')})`,
      limit: 1000,
    },
  })

  return new Map(rows.map((row) => [
    row.id,
    `${row.year} ${row.brand} ${row.model}${row.variant ? ` ${row.variant}` : ''}`.trim(),
  ]))
}

async function mapReservations(rows: ReservationRow[]) {
  const titles = await fetchVehicleTitleMap(Array.from(new Set(rows.map((row) => row.vehicle_id))))
  return rows.map((row): VehicleReservation => ({
    id: row.id,
    galleryId: row.gallery_id,
    vehicleId: row.vehicle_id,
    vehicleTitle: titles.get(row.vehicle_id) || 'Araç',
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    note: row.note,
    status: row.status,
    depositAmount: Number(row.deposit_amount),
    paymentStatus: row.payment_status,
    handledByEmail: row.handled_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function listLeadInteractions(input: { galleryId: string; leadId: string }) {
  requireSupabaseAdminConfig()
  const rows = await supabaseAdminFetch<LeadInteractionRow[]>({
    path: '/rest/v1/lead_interactions',
    query: {
      select: 'id,lead_id,actor_email,channel,direction,template_key,message_preview,created_at',
      gallery_id: `eq.${input.galleryId}`,
      lead_id: `eq.${input.leadId}`,
      order: 'created_at.desc',
      limit: 200,
    },
  })
  return rows.map(mapInteraction)
}

export async function createLeadInteraction(input: {
  galleryId: string
  leadId: string
  actorEmail: string
  channel: LeadInteraction['channel']
  direction?: LeadInteraction['direction']
  templateKey?: string | null
  messagePreview?: string | null
}) {
  requireSupabaseAdminConfig()
  const rows = await supabaseAdminFetch<LeadInteractionRow[]>({
    method: 'POST',
    path: '/rest/v1/lead_interactions',
    prefer: 'return=representation',
    body: [{
      gallery_id: input.galleryId,
      lead_id: input.leadId,
      actor_email: input.actorEmail.toLowerCase(),
      channel: input.channel,
      direction: input.direction || 'outbound',
      template_key: input.templateKey || null,
      message_preview: input.messagePreview?.slice(0, 500) || null,
    }],
  })
  if (!rows[0]) throw new Error('Müşteri etkileşimi kaydedilemedi.')
  return mapInteraction(rows[0])
}

export async function listPanelReservations(galleryId: string) {
  requireSupabaseAdminConfig()
  const rows = await supabaseAdminFetch<ReservationRow[]>({
    path: '/rest/v1/vehicle_reservations',
    query: {
      select: 'id,gallery_id,vehicle_id,customer_name,customer_phone,customer_email,note,status,deposit_amount,payment_status,handled_by_email,created_at,updated_at',
      gallery_id: `eq.${galleryId}`,
      order: 'created_at.desc',
      limit: 1000,
    },
  })
  return mapReservations(rows)
}

export async function createPublicVehicleReservation(input: {
  vehicleRouteId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  note?: string
}) {
  requireSupabaseAdminConfig()
  const vehicles = await supabaseAdminFetch<Array<{ id: string; gallery_id: string; status: string; deleted_at: string | null }>>({
    path: '/rest/v1/vehicles',
    query: {
      select: 'id,gallery_id,status,deleted_at',
      slug: `eq.${input.vehicleRouteId}`,
      status: 'eq.active',
      deleted_at: 'is.null',
      limit: 1,
    },
  })
  const vehicle = vehicles[0]
  if (!vehicle) throw new Error('Rezervasyona uygun araç bulunamadı.')

  const existing = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/vehicle_reservations',
    query: {
      select: 'id',
      vehicle_id: `eq.${vehicle.id}`,
      customer_phone: `eq.${input.customerPhone}`,
      status: 'in.(pending,approved)',
      limit: 1,
    },
  })
  if (existing[0]) throw new Error('Bu araç için açık rezervasyon talebiniz zaten var.')

  const rows = await supabaseAdminFetch<ReservationRow[]>({
    method: 'POST',
    path: '/rest/v1/vehicle_reservations',
    prefer: 'return=representation',
    body: [{
      gallery_id: vehicle.gallery_id,
      vehicle_id: vehicle.id,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      customer_email: input.customerEmail?.trim() || null,
      note: input.note?.trim() || null,
      status: 'pending',
      payment_status: 'unpaid',
    }],
  })
  if (!rows[0]) throw new Error('Rezervasyon talebi oluşturulamadı.')
  return (await mapReservations(rows))[0]
}

export async function updatePanelReservation(input: {
  galleryId: string
  reservationId: string
  status?: VehicleReservationStatus
  paymentStatus?: VehicleReservationPaymentStatus
  depositAmount?: number
  handledByEmail: string
}) {
  requireSupabaseAdminConfig()
  const patch: Record<string, unknown> = { handled_by_email: input.handledByEmail.toLowerCase() }
  if (input.status) patch.status = input.status
  if (input.paymentStatus) patch.payment_status = input.paymentStatus
  if (input.depositAmount !== undefined) patch.deposit_amount = input.depositAmount

  const rows = await supabaseAdminFetch<ReservationRow[]>({
    method: 'PATCH',
    path: '/rest/v1/vehicle_reservations',
    query: {
      id: `eq.${input.reservationId}`,
      gallery_id: `eq.${input.galleryId}`,
    },
    prefer: 'return=representation',
    body: patch,
  })
  const updated = rows[0]
  if (!updated) throw new Error('Rezervasyon bulunamadı.')

  if (input.status === 'approved' || input.status === 'completed') {
    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/vehicles',
      query: { id: `eq.${updated.vehicle_id}`, gallery_id: `eq.${input.galleryId}` },
      prefer: 'return=minimal',
      body: { status: input.status === 'completed' ? 'sold' : 'reserved' },
    })
  } else if (input.status === 'declined' || input.status === 'cancelled') {
    await supabaseAdminFetch<unknown>({
      method: 'PATCH',
      path: '/rest/v1/vehicles',
      query: { id: `eq.${updated.vehicle_id}`, gallery_id: `eq.${input.galleryId}`, status: 'eq.reserved' },
      prefer: 'return=minimal',
      body: { status: 'active' },
    })
  }

  return (await mapReservations([updated]))[0]
}

export async function listPanelReviews(galleryId: string) {
  requireSupabaseAdminConfig()
  const rows = await supabaseAdminFetch<ReviewRow[]>({
    path: '/rest/v1/gallery_reviews',
    query: {
      select: 'id,gallery_id,customer_name,customer_email,rating,comment,status,moderated_by_email,created_at,updated_at',
      gallery_id: `eq.${galleryId}`,
      order: 'created_at.desc',
      limit: 1000,
    },
  })
  return rows.map(mapReview)
}

export async function listPublicGalleryReviews(gallerySlug: string) {
  requireSupabaseAdminConfig()
  const galleries = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/galleries',
    query: { select: 'id', slug: `eq.${gallerySlug}`, limit: 1 },
  })
  const gallery = galleries[0]
  if (!gallery) return { reviews: [], averageRating: 0, reviewCount: 0, trusted: false }

  const rows = await supabaseAdminFetch<ReviewRow[]>({
    path: '/rest/v1/gallery_reviews',
    query: {
      select: 'id,gallery_id,customer_name,customer_email,rating,comment,status,moderated_by_email,created_at,updated_at',
      gallery_id: `eq.${gallery.id}`,
      status: 'eq.published',
      order: 'created_at.desc',
      limit: 100,
    },
  })
  const reviews = rows.map(mapReview)
  const averageRating = reviews.length
    ? Number((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1))
    : 0

  return {
    reviews,
    averageRating,
    reviewCount: reviews.length,
    trusted: reviews.length >= 3 && averageRating >= 4.5,
  }
}

export async function createPublicGalleryReview(input: {
  gallerySlug: string
  customerName: string
  customerEmail?: string
  rating: number
  comment: string
}) {
  requireSupabaseAdminConfig()
  const galleries = await supabaseAdminFetch<Array<{ id: string }>>({
    path: '/rest/v1/galleries',
    query: { select: 'id', slug: `eq.${input.gallerySlug}`, limit: 1 },
  })
  const gallery = galleries[0]
  if (!gallery) throw new Error('Galeri bulunamadı.')

  const rows = await supabaseAdminFetch<ReviewRow[]>({
    method: 'POST',
    path: '/rest/v1/gallery_reviews',
    prefer: 'return=representation',
    body: [{
      gallery_id: gallery.id,
      customer_name: input.customerName.trim(),
      customer_email: input.customerEmail?.trim() || null,
      rating: input.rating,
      comment: input.comment.trim(),
      status: 'pending',
    }],
  })
  if (!rows[0]) throw new Error('Yorum gönderilemedi.')
  return mapReview(rows[0])
}

export async function updatePanelReview(input: {
  galleryId: string
  reviewId: string
  status: GalleryReviewStatus
  moderatedByEmail: string
}) {
  requireSupabaseAdminConfig()
  const rows = await supabaseAdminFetch<ReviewRow[]>({
    method: 'PATCH',
    path: '/rest/v1/gallery_reviews',
    query: { id: `eq.${input.reviewId}`, gallery_id: `eq.${input.galleryId}` },
    prefer: 'return=representation',
    body: {
      status: input.status,
      moderated_by_email: input.moderatedByEmail.toLowerCase(),
    },
  })
  if (!rows[0]) throw new Error('Yorum bulunamadı.')
  return mapReview(rows[0])
}

export async function getPanelTeamPerformance(input: { galleryId: string; ownerEmail: string }) {
  requireSupabaseAdminConfig()
  const [members, leadResult, interactions, reservations] = await Promise.all([
    fetchPanelTeamMembers(input.galleryId),
    listPanelLeads(input.ownerEmail),
    supabaseAdminFetch<Array<{ actor_email: string; channel: string; created_at: string }>>({
      path: '/rest/v1/lead_interactions',
      query: {
        select: 'actor_email,channel,created_at',
        gallery_id: `eq.${input.galleryId}`,
        limit: 10000,
      },
    }).catch(() => []),
    supabaseAdminFetch<Array<{ handled_by_email: string | null; status: string }>>({
      path: '/rest/v1/vehicle_reservations',
      query: {
        select: 'handled_by_email,status',
        gallery_id: `eq.${input.galleryId}`,
        limit: 10000,
      },
    }).catch(() => []),
  ])

  return members.filter((member) => member.status === 'active').map((member) => {
    const email = (member.email || '').toLowerCase()
    const assignedLeads = leadResult.items.filter((lead) => getLeadAssignment(lead).assigneeName === member.name)
    const wonLeads = assignedLeads.filter((lead) => lead.status === 'satisa-dondu').length
    const whatsappCount = interactions.filter((interaction) => interaction.actor_email.toLowerCase() === email && interaction.channel === 'whatsapp').length
    const handledReservations = reservations.filter((reservation) => reservation.handled_by_email?.toLowerCase() === email).length

    return {
      memberId: member.id,
      name: member.name,
      email,
      role: member.role,
      assignedLeads: assignedLeads.length,
      wonLeads,
      conversionRate: assignedLeads.length ? Math.round((wonLeads / assignedLeads.length) * 100) : 0,
      whatsappCount,
      handledReservations,
    }
  })
}

