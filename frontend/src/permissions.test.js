import { describe, expect, it } from 'vitest'
import { isManager, statusActions } from './permissions'

const admin = { id: 1, role: 'Admin' }
const lead = { id: 2, role: 'Support Lead' }
const tech = { id: 3, role: 'Field Tech' }

const labels = (user, ticket) => statusActions(user, ticket).map((a) => a.label)

describe('permissions', () => {
  it('treats Admin and Support Lead as managers', () => {
    expect(isManager(admin)).toBe(true)
    expect(isManager(lead)).toBe(true)
    expect(isManager(tech)).toBe(false)
    expect(isManager(null)).toBe(false)
  })

  it('offers managers every transition from the current status', () => {
    expect(labels(lead, { status: 'open', assignee_id: null })).toEqual(['Start work'])
    expect(labels(lead, { status: 'in_progress', assignee_id: 3 })).toEqual(['Resolve', 'Back to queue'])
    expect(labels(admin, { status: 'resolved', assignee_id: 3 })).toEqual(['Reopen'])
  })

  it('offers field techs actions only on their own tickets, and never reopen', () => {
    expect(labels(tech, { status: 'open', assignee_id: 3 })).toEqual(['Start work'])
    expect(labels(tech, { status: 'open', assignee_id: 5 })).toEqual([])
    expect(labels(tech, { status: 'resolved', assignee_id: 3 })).toEqual([])
  })
})
