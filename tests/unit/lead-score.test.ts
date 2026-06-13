import { describe, expect, it } from 'vitest'
import { calculateLeadScore } from '@/lib/lead-score'
import type { PanelLead } from '@/lib/panel-types'

const baseLead: PanelLead = {
  id: 'lead-1',
  customerName: 'Ali Demir',
  customerPhone: '05301234567',
  source: 'form',
  status: 'yeni',
  notes: [],
  createdAt: '2026-06-10T10:00:00.000Z',
  updatedAt: '2026-06-10T10:00:00.000Z',
}

describe('calculateLeadScore', () => {
  it('prioritizes test-drive leads with planned follow-up', () => {
    const result = calculateLeadScore({
      ...baseLead,
      source: 'test-surusu',
      status: 'test-surusu',
      followUpDate: '2026-06-12',
      notes: ['Randevu konuşuldu'],
    }, Date.parse('2026-06-11T10:00:00.000Z'))
    expect(result.label).toBe('Sıcak')
    expect(result.score).toBeGreaterThanOrEqual(70)
  })

  it('keeps old unanswered leads low priority', () => {
    const result = calculateLeadScore(baseLead, Date.parse('2026-07-10T10:00:00.000Z'))
    expect(result.label).toBe('Soğuk')
  })
})
