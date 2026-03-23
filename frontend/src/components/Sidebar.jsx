import { useMemo } from 'react'
import { DashboardIcon, TicketIcon, ServerIcon, UsersIcon, LogoutIcon, LogoIcon } from './Icons'

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: DashboardIcon },
  { id: 'tickets', label: 'Tickets', icon: TicketIcon },
  { id: 'assets', label: 'Assets', icon: ServerIcon },
  { id: 'users', label: 'Workforce', icon: UsersIcon },
]

const Sidebar = ({ view, onNavigate, onLogout }) => {
  const items = useMemo(() => navItems, [])

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <LogoIcon />
        </div>
        <div className="brand-text">
          <h2>AssetDesk</h2>
          <span>IT Operations Hub</span>
        </div>
      </div>

      <nav className="nav">
        <p className="nav-label">Navigation</p>
        {items.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={view === item.id ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => onNavigate(item.id)}
            >
              <Icon />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-foot__user">
          <div className="sidebar-avatar">IT</div>
          <div>
            <p className="sidebar-foot__name">IT Operations</p>
            <p className="sidebar-foot__role">Administrator</p>
          </div>
        </div>
        <button className="sidebar-logout" onClick={onLogout}>
          <LogoutIcon />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  )
}

export { navItems }
export default Sidebar
