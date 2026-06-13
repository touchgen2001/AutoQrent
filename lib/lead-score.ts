import type { PanelLead } from '@/lib/panel-types'

const DAY_MS = 24 * 60 * 60 * 1000

export type LeadScore = {
  score: number
  label: 'Sıcak' | 'Ilık' | 'Soğuk'
  tone: 'hot' | 'warm' | 'cold'
  reasons: string[]
}

export function calculateLeadScore(lead: PanelLead, now = Date.now()): LeadScore {
  let score = 20
  const reasons: string[] = []
  const createdAt = Date.parse(lead.createdAt)
  const ageDays = Number.isFinite(createdAt) ? Math.max(0, Math.floor((now - createdAt) / DAY_MS)) : 30

  const statusPoints: Record<PanelLead['status'], number> = {
    yeni: 12,
    arandi: 22,
    gorusuluyor: 35,
    'test-surusu': 48,
    'satisa-dondu': 60,
    kayip: -20,
  }
  score += statusPoints[lead.status]
  if (lead.status === 'test-surusu') reasons.push('Test sürüşü aşamasında')
  if (lead.status === 'gorusuluyor') reasons.push('Aktif görüşme sürüyor')

  if (lead.source === 'qr' || lead.source === 'test-surusu') {
    score += 10
    reasons.push(lead.source === 'qr' ? 'Araç QR kodundan geldi' : 'Test sürüşü talebi')
  }
  if (lead.customerEmail) score += 4
  if (lead.notes.length > 0) {
    score += Math.min(lead.notes.length * 3, 12)
    reasons.push('Görüşme notları bulunuyor')
  }
  if (lead.followUpDate) {
    score += 8
    reasons.push('Takip tarihi planlandı')
  }
  if (ageDays <= 2) {
    score += 8
    reasons.push('Yeni müşteri talebi')
  } else if (ageDays > 14 && lead.status === 'yeni') {
    score -= 15
    reasons.push('Uzun süredir yanıt bekliyor')
  }

  score = Math.max(0, Math.min(100, score))
  if (score >= 70) return { score, label: 'Sıcak', tone: 'hot', reasons }
  if (score >= 45) return { score, label: 'Ilık', tone: 'warm', reasons }
  return { score, label: 'Soğuk', tone: 'cold', reasons }
}
