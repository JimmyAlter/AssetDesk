import { describe, expect, it } from 'vitest'
import { mergeTickets } from './tickets'

const ticket = (id, created, updated = created, extra = {}) => ({
  id, created_at: created, updated_at: updated, status: 'open', ...extra,
})

describe('mergeTickets', () => {
  it('keeps a ticket created while the initial load was in flight', () => {
    const loaded = [ticket(2, '2026-09-28 10:00:00'), ticket(1, '2026-09-27 10:00:00')]
    const createdDuringLoad = [ticket(3, '2026-09-28 12:00:00')]
    expect(mergeTickets(loaded, createdDuringLoad).map((t) => t.id)).toEqual([3, 2, 1])
  })

  it('does not roll back a ticket updated while loading', () => {
    const loaded = [ticket(1, '2026-09-27 10:00:00', '2026-09-27 10:00:00', { status: 'open' })]
    const current = [ticket(1, '2026-09-27 10:00:00', '2026-09-28 09:00:00', { status: 'in_progress' })]
    expect(mergeTickets(loaded, current)).toEqual(current)
  })

  it('prefers the loaded copy when it is at least as new', () => {
    const loaded = [ticket(1, '2026-09-27 10:00:00', '2026-09-28 09:00:00', { status: 'resolved' })]
    const current = [ticket(1, '2026-09-27 10:00:00', '2026-09-28 09:00:00', { status: 'in_progress' })]
    expect(mergeTickets(loaded, current)[0].status).toBe('resolved')
  })

  it('returns the loaded list unchanged when nothing happened meanwhile', () => {
    const loaded = [ticket(2, '2026-09-28 10:00:00'), ticket(1, '2026-09-27 10:00:00')]
    expect(mergeTickets(loaded, [])).toEqual(loaded)
  })
})
