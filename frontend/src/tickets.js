// Merge a freshly loaded ticket list with the tickets already in state.
// A ticket created or updated while the list was loading must not be lost or
// rolled back, so for each id the copy with the later updated_at wins (the
// loaded copy on a tie), and tickets missing from the loaded list are kept.
export const mergeTickets = (loaded, current) => {
  const byId = new Map(loaded.map((ticket) => [ticket.id, ticket]))
  for (const ticket of current) {
    const other = byId.get(ticket.id)
    if (!other || ticket.updated_at > other.updated_at) byId.set(ticket.id, ticket)
  }
  return [...byId.values()].sort((a, b) =>
    b.created_at === a.created_at ? b.id - a.id : b.created_at.localeCompare(a.created_at)
  )
}
