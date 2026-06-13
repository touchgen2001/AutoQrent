import { describe, expect, it } from 'vitest'
import {
  buildDefaultPanelTeam,
  buildLeadAssignmentNote,
  countUnassignedOpenLeads,
  getLeadAssignment,
} from '@/lib/lead-assignment'
import type { PanelLead } from '@/lib/panel-types'

const baseLead: PanelLead = {
  id: 'lead-1',
  customerName: 'Ali Demir',
  customerPhone: '05301234567',
  source: 'qr',
  status: 'yeni',
  notes: [],
  createdAt: '2026-06-12T10:00:00.000Z',
  updatedAt: '2026-06-12T10:00:00.000Z',
}

describe('lead assignment helpers', () => {
  it('builds only the owner account from the session', () => {
    const members = buildDefaultPanelTeam({ name: 'Rüzgar Galeri', email: 'owner@example.com' })
    expect(members[0]).toEqual(expect.objectContaining({ name: 'Rüzgar Galeri', email: 'owner@example.com', role: 'owner' }))
    expect(members).toHaveLength(1)
  })

  it('parses the latest assignment note', () => {
    const members = buildDefaultPanelTeam({ name: 'Test Owner' })
    const assignment = getLeadAssignment({
      ...baseLead,
      notes: ['Eski not', buildLeadAssignmentNote(members[0])],
    })

    expect(assignment.assigneeName).toBe('Test Owner')
    expect(assignment.assigneeRole).toBe('owner')
    expect(assignment.tone).toBe('assigned')
  })

  it('counts open leads without an assignee', () => {
    const members = buildDefaultPanelTeam({ name: 'Test Owner' })
    const count = countUnassignedOpenLeads([
      baseLead,
      { ...baseLead, id: 'lead-2', status: 'kayip' },
      { ...baseLead, id: 'lead-3', notes: [buildLeadAssignmentNote(members[0])] },
    ])

    expect(count).toBe(1)
  })
})
