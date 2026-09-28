// Role names as stored in users.role.
const ROLES = Object.freeze({
  ADMIN: 'Admin',
  LEAD: 'Support Lead',
  TECH: 'Field Tech',
})

// Roles that manage the whole service desk: they see every ticket, can assign
// work, reopen resolved tickets and read the people directory.
const MANAGERS = [ROLES.ADMIN, ROLES.LEAD]

const TICKET_STATUSES = ['open', 'in_progress', 'resolved']

// Allowed status changes: open -> in_progress -> resolved, with a way back to
// the queue and a reopen for resolved tickets.
const TRANSITIONS = {
  open: ['in_progress'],
  in_progress: ['open', 'resolved'],
  resolved: ['open'],
}

const canTransition = (role, from, to) => {
  if (!TRANSITIONS[from]?.includes(to)) return false
  // Reopening a resolved ticket is a manager decision.
  if (from === 'resolved') return MANAGERS.includes(role)
  return true
}

module.exports = { ROLES, MANAGERS, TICKET_STATUSES, TRANSITIONS, canTransition }
