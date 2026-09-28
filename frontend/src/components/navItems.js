import { DashboardIcon, TicketIcon, ServerIcon, UsersIcon } from './Icons'

export const navItems = [
  { id: 'dashboard', label: 'Overview', icon: DashboardIcon },
  { id: 'tickets', label: 'Tickets', icon: TicketIcon },
  { id: 'assets', label: 'Assets', icon: ServerIcon },
  // The people directory is limited to Admin and Support Lead by the API.
  { id: 'users', label: 'Workforce', icon: UsersIcon, managersOnly: true },
]
