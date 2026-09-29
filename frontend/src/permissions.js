// Mirrors backend/src/roles.js. The API enforces these rules; the UI uses them
// only to hide controls a user cannot use.
export const ROLES = {
  ADMIN: 'Admin',
  LEAD: 'Support Lead',
  TECH: 'Field Tech',
}

// Short labels for the role pill on narrow screens.
export const SHORT_ROLE_LABELS = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.LEAD]: 'Lead',
  [ROLES.TECH]: 'Tech',
}

export const isManager = (user) => user?.role === ROLES.ADMIN || user?.role === ROLES.LEAD

export const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

export const STATUS_TONES = {
  open: 'blue',
  in_progress: 'amber',
  resolved: 'green',
}

export const PRIORITY_TONES = {
  high: 'red',
  medium: 'amber',
  low: 'gray',
}

const ACTIONS = [
  { from: 'open', to: 'in_progress', label: 'Start work' },
  { from: 'in_progress', to: 'resolved', label: 'Resolve' },
  { from: 'in_progress', to: 'open', label: 'Back to queue' },
  { from: 'resolved', to: 'open', label: 'Reopen', managersOnly: true },
]

// Status buttons the user may use on this ticket.
export const statusActions = (user, ticket) => {
  if (!user || !ticket) return []
  const manager = isManager(user)
  if (!manager && ticket.assignee_id !== user.id) return []
  return ACTIONS.filter((action) => action.from === ticket.status && (manager || !action.managersOnly))
}
